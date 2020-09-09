import amqp from 'amqplib';
import {Client} from 'pg';
import {ResponseBuffer} from './response-buffer';
import {Looper} from './looper';
import {getRabbitURI, getPostgresURI} from './credentials';
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

  constructor() {}

  /**
   * start the Application
   *
   * @memberof Application
   */
  async start() {
    appLogger.info('Starting response monitor');
    /* Setup database & response buffers */
    this.client = new Client(getPostgresURI());
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
  }

  private onPreConsume(message: amqp.ConsumeMessage) {
    try {
      this.onConsume(message);
    } catch (e) {
      console.error(e);
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

    switch (response.Response) {
      case 'GetDeviceStatus':
      case 'GetPowerStatus':
      case 'GetVersion':
      case 'ScanGPS':
      case 'ScanWifiSignal':
      case 'SetAutoReport':
      case 'SetPowerSaving':
      case 'SetReportInterval':
        {
          /* insert response into buffer */
          const save = {
            id: response.id,
            time: new Date(),
            response: response_text,
          };
          this.buffer!.add(
            save,
            this.onResponseSaveSuccess,
            this.onResponseSaveFailure,
            message
          );

          /* Send it back to queue */
          const key = `tracker.${trackerId}.notification.respond`;
          this.amqpChannel!.publish('tracker-event', key, message.content);
        }
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
      run
        .then(() => {
          const messages = buffer.state as object[];
          const lastMessage = messages[messages.length - 1];
          this.onResponseSaveSuccess(lastMessage, true);
        })
        .catch(error => {
          throw error;
        });
    } catch (e) {
      console.error('[WARNING] fallback to one by one method');

      /* For all requests */
      for (let index = 0; index < buffer.responseBuffer.length; index++) {
        const response = buffer.responseBuffer[index];
        const message = buffer.state[index] as amqp.ConsumeMessage;

        /* Attempts to store the single response into db */
        insertResponse
          .run({responses: [response]}, this.client!)
          .then(() => {
            /* Success: we ack it */
            this.amqpChannel!.ack(message, false);
          })
          .catch(error => {
            /* Failure: we nack it */
            console.error('[ERROR] failed to store response, message unacked.');
            console.error(error);
            this.amqpChannel!.nack(message, false);
          });
      }
    }
  }

  private onResponseSaveSuccess(message: object, all = false) {
    appLogger.info(`Ack ${all ? 'all messages' : '1 message'}`);
    this.amqpChannel!.ack(message as amqp.ConsumeMessage, all);
  }
  private onResponseSaveFailure() {
    throw new UnableToStoreAllResponseError();
  }
}

class UnknownResponseError extends Error {
  message = 'Invalid Response Type';
}
class UnableToStoreAllResponseError extends Error {
  message = 'One of the request is invalid';
}
class CannotResolveTrackerIdError extends Error {
  message = 'Unknown tracker id';
}
