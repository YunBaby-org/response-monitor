import amqp from 'amqplib';
import {getURI} from './credentials';
import {Response} from './response';
import {getPrefetch, getTrackerId} from './utility/getTrackerId';
import {sleep} from './utility/sleep';
import {AmqpConnectionFailureException} from './exceptions/AmqpConnectionFailureException';

async function createChannel(retry: number) {
  for (let i = 0; i < retry; i++) {
    try {
      return await amqp.connect(getURI());
    } catch (e) {
      console.log('Connect to amqp channel failed, retry after 2 second:', e);
    }
    if (i === retry - 1) break;
    else await sleep(2000);
  }
  console.log(
    `Failed to setup connection after ${retry} attempts, force stop the program`
  );
  throw new AmqpConnectionFailureException(
    `Cannot establish connection to ${getURI()}`
  );
}

async function setup() {
  console.log(new Date(), 'Initialize response monitor');

  const connection = await createChannel(5);
  const channel = await connection.createConfirmChannel();

  console.log(new Date(), 'Consumer prefetch size:', getPrefetch());
  await channel.prefetch(getPrefetch(), false);

  console.log(new Date(), 'Assert queues');
  await channel.assertQueue('monitor.responses', {durable: true});

  console.log(new Date(), 'Setup consumer');
  await channel.consume('monitor.responses', message => {
    if (message) {
      const response = JSON.parse(message.content.toString('utf8')) as Response;
      const trackerId = getTrackerId(message);

      if (!trackerId) {
        console.error(
          new Date(),
          'Invalid routing key, cannot parse trackerId from routing key'
        );
        return;
      }

      switch (response.Response) {
        case 'GetDeviceStatus':
        case 'GetPowerStatus':
        case 'GetVersion':
        case 'ScanGPS':
        case 'ScanWifiSignal':
        case 'SetAutoReport':
        case 'SetPowerSaving':
        case 'SetReportInterval': {
          /* TODO: Store it into database */

          /* Send it back to queue */
          const routingKey = `tracker.${trackerId}.notification.respond`;
          channel.publish('tracker-event', routingKey, message.content);
          break;
        }
        default:
          console.error(new Date(), 'Unknown response -> ', response.Response);
      }
      channel.ack(message);
    }
  });
}

setup();
