import waitOn from 'wait-on';
import {getRabbitHost, getRabbitPort, getPostgresSetup} from '../credentials';

export async function waitRabbitMQ(options: object | undefined) {
  options = options || {};
  await waitOn({
    ...options,
    resources: [`tcp:${getRabbitHost()}:${getRabbitPort()}`],
  });
}

export async function waitPostgres(options: object | undefined) {
  options = options || {};
  const {host, port} = getPostgresSetup();
  await waitOn({
    ...options,
    resources: [`tcp:${host}:${port}`],
  });
}
