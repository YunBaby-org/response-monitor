import Application from './application';
import {waitRabbitMQ, waitPostgres} from './utility/wait';
import {appLogger} from './loggers';
import {getRabbitURI, getPostgresURI} from './credentials';

async function waitDependencies() {
  const opt = {timeout: 30000};
  await Promise.all([waitRabbitMQ(opt), waitPostgres(opt)]);
}

async function setup() {
  /* Wait for dependencies ready */
  appLogger.info('Connection timeout: RabbitMQ & Postgres');
  appLogger.info(`    RabbitMQ URI: ${getRabbitURI()}`);
  appLogger.info(`    Postgres URI: ${getPostgresURI()}`);
  await waitDependencies().catch(error => {
    appLogger.error('Connect to Postgres and RabbitMQ timeouted');
    throw error;
  });

  /* Setup application */
  const app = new Application();
  app.start();
}

setup();
