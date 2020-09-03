import {ConsumeMessage} from 'amqplib';

export function getTrackerId(message: ConsumeMessage) {
  const split = message.fields.routingKey.split('.');
  return split.length >= 2 ? split[1] : null;
}

export function getPrefetch() {
  return parseInt(process.env.PREFETCH_SIZE || '10');
}
