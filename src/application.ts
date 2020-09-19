import amqp from 'amqplib';
import {Client} from 'pg';
import {ResponseBuffer} from './response-buffer';
import {Looper} from './looper';
import {getRabbitURI, getPostgresURI, getPostgresSetup} from './credentials';
import {getPrefetch, getTrackerId} from './utility/getTrackerId';
import {Response} from './response';
import {insertResponse} from './query/tracker-requests.queries';
import {appLogger} from './loggers';

export default class Application {
  private amqpConnection: amqp.Connection | undefined;
  private amqpChannel: amqp.ConfirmChannel | undefined;
  private client: Client | undefined;
  private buffer: ResponseBuffer | undefined;
  private looper: Looper | undefined;
  private stopped: boolean;

  constructor() {
    this.stopped = false;
  }

  /**
   * start the Application
   *
   * @memberof Application
   */
  async start() {
    appLogger.info('Starting response monitor');
    /* Setup database & response buffers */
    this.client = new Client(getPostgresSetup());
    await this.client.connect();
    this.buffer = new ResponseBuffer();
    this.looper = new Looper(200, this.onRefreshBuffer.bind(this));
    this.looper.startLooper();
    appLogger.info('Client & Buffer & Looper initialized');

    /* Setup amqp */
    this.amqpConnection = await amqp.connect(getRabbitURI());
    this.amqpChannel = await this.amqpConnection.createConfirmChannel();
    await this.amqpChannel.prefetch(getPrefetch(), false);
    await this.amqpChannel.assertQueue('monitor.responses', {durable: true});
    await this.amqpChannel.consume(
      'monitor.responses',
      message => message && this.onPreConsume(message)
    );
    appLogger.info('AMQP connection established');

    this.registerEvents();
  }

  private registerEvents() {
    this.client!.on('error', error => {
      appLogger.error(error);
      appLogger.error('Postgres connection error');
      this.stop();
    });
    this.client!.on('end', () => {
      appLogger.warn('Postgres connection closed');
      this.stop();
    });
    this.amqpConnection!.on('error', error => {
      appLogger.error(error);
      appLogger.error('RabbitMQ connection error');
      this.stop();
    });
    this.amqpConnection!.on('close', () => {
      appLogger.warn('RabbitMQ connection closed');
      this.stop();
    });
    process.on('SIGQUIT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  private async stop() {
    if (!this.stopped) {
      this.stopped = true;
      if (this.looper) {
        this.looper.stopLooper();
      }
      appLogger.info('Stopping response monitor...');
      appLogger.info('Closing RabbitMQ & Postgres connection');
      await this.amqpConnection!.close()
        .timeout(5000, 'AMQP connection timeouted')
        .catch(error => {
          appLogger.error(error);
        });
      await this.client!.end().catch(error => {
        appLogger.error(error);
      });
      appLogger.info('Done');
    }
  }

  private onPreConsume(message: amqp.ConsumeMessage) {
    try {
      this.onConsume(message);
    } catch (e) {
      appLogger.error(e);
      appLogger.error('Failed to handle response, message unacked');
      appLogger.error(`Payload content: ${message.content}`);
      this.amqpChannel!.nack(message, false, false);
    }
  }

  /**
   * event: consuming a incoming response
   *
   * @private
   * @param {amqp.ConsumeMessage} message
   * @memberof Application
   */
  private onConsume(message: amqp.ConsumeMessage) {
    const response_text = message.content.toString('utf8');
    const response = JSON.parse(response_text) as Response;
    const trackerId = getTrackerId(message);

    if (!trackerId)
      throw new CannotResolveTrackerIdError(message.fields.routingKey);
    if (typeof response.id !== 'string')
      throw new InvalidResponseIdError(response.id);

    switch (response.Response) {
      case 'GetDeviceStatus':
      case 'GetPowerStatus':
      case 'GetVersion':
      case 'ScanGPS':
      case 'ScanWifiSignal_Resolved':
      case 'ScanWifiSignal_Resolved_Failure':
      case 'SetAutoReport':
      case 'SetPowerSaving':
      case 'SetReportInterval':
        {
          /* insert response into buffer */
          const save = {
            tracker_id: trackerId,
            id: response.id,
            time: new Date(),
            response: response_text,
          };
          this.buffer!.add(save, message);

          /* Send it back to queue */
          const key = `tracker.${trackerId}.notification.respond`;
          this.amqpChannel!.publish('tracker-event', key, message.content);
        }
        break;
      case 'ScanWifiSignal':
        /* Redirect message to Locating Server */
        this.amqpChannel!.publish(
          'locating-server',
          trackerId,
          message.content
        );
        break;
      default:
        throw new UnknownResponseError();
    }
  }

  /**
   * event: on refreshing the response buffer
   *
   * @private
   * @returns
   * @memberof Application
   */
  private async onRefreshBuffer() {
    /* Retrieve current responses */
    const buffer = this.buffer!.refreshBufferContent();

    if (buffer.responseBuffer.length > 5) {
      /* A lot traffic, Make queue faster */
      this.looper!.addNextInterval(-80, 50, 300);
    } else if (buffer.responseBuffer.length === 0) {
      /* No traffic, Make queue slower by adjust interval */
      this.looper!.addNextInterval(30, 50, 300);
      return;
    }

    appLogger.debug(`Refresh buffer with size ${buffer.responseBuffer.length}`);

    /* Attempts to save current responses to database */
    try {
      const responses = {responses: buffer.responseBuffer};
      const run = insertResponse.run(responses, this.client!);
      await run
        .then(() => {
          const messages = buffer.state as object[];
          const lastMessage = messages[messages.length - 1];
          this.onResponseSaveSuccess(lastMessage, true);
        })
        .catch(error => {
          throw error;
        });
    } catch (e) {
      appLogger.warn(
        'Failed to write data in bulk load, fallback to singular writing'
      );

      /* For all requests */
      try {
        for (let index = 0; index < buffer.responseBuffer.length; index++) {
          const response = buffer.responseBuffer[index];
          const message = buffer.state[index] as amqp.ConsumeMessage;

          /* Attempts to store the single response into db */
          await insertResponse
            .run({responses: [response]}, this.client!)
            .then(() => {
              /* Success: we ack it */
              appLogger.info('Ack 1 message (singular mode)');
              this.amqpChannel!.ack(message, false);
            })
            .catch(error => {
              /* Failure: we nack it */
              appLogger.error(
                'Failed to save the message into database, message unacked'
              );
              appLogger.error('Unack 1 message (singular mode)');
              appLogger.error(error);
              this.amqpChannel!.nack(message, false, false);
            });
        }
      } catch (e) {
        appLogger.error(
          'CRITICAL! failed to perform singular writing to responses, all message unacked and requeued'
        );
        const [lastMessage] = buffer.state.slice(-1);
        this.amqpChannel!.nack(lastMessage as amqp.ConsumeMessage, true, true);
      }
    }
  }

  private onResponseSaveSuccess(message: object, all = false) {
    appLogger.info(`Ack ${all ? 'all messages' : '1 message'}`);
    this.amqpChannel!.ack(message as amqp.ConsumeMessage, all);
  }
}

class UnknownResponseError extends Error {
  message = 'Invalid response type';
}
class CannotResolveTrackerIdError extends Error {
  message = 'Unknown tracker id';
}
class InvalidResponseIdError extends Error {
  message = 'Invalid response id';
}
