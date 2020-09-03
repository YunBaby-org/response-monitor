import amqp from 'amqplib';
import {getURI} from './credentials';
import {Response} from './response';
import {getTrackerId, getPrefetch} from './utility/getTrackerId';

async function setup() {
  console.log(new Date(), 'Intialize response monitor');

  const connection = await amqp.connect(getURI());
  const channel = await connection.createConfirmChannel();

  console.log(new Date(), 'Consumer prefetch size:', getPrefetch());
  channel.prefetch(getPrefetch(), false);

  console.log(new Date(), 'Assert queues');
  channel.assertQueue('monitor.responses', {durable: true});

  console.log(new Date(), 'Setup consumer');
  channel.consume('monitor.responses', message => {
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
        case 'SetReportInterval':
          /* TODO: Store it into database */

          /* Send it back to queue */
          const routingKey = `tracker.${trackerId}.notification.respond`;
          channel.publish('tracker-event', routingKey, message.content);
          break;
        default:
          console.error(new Date(), 'Unknown response -> ', response.Response);
      }
      channel.ack(message);
    }
  });
}

setup();
