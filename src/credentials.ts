import fs from 'fs';

export function getPasswordSync() {
  if (process.env.RABBITMQ_PASS_FILE)
    return fs.readFileSync(process.env.RABBITMQ_PASS_FILE, 'utf8');
  return process.env.RABBITMQ_PASS || 'guest';
}
export function getUsername() {
  return process.env.RABBITMQ_USER || 'guest';
}
export function getRabbitHost() {
  return process.env.RABBITMQ_HOST || 'localhost';
}
export function getRabbitPort() {
  return process.env.RABBITMQ_PORT || '5672';
}

export function getRabbitURI() {
  const username = getUsername();
  const password = getPasswordSync();
  const hostname = getRabbitHost();
  const port = getRabbitPort();
  return (
    process.env.RABBITMQ_URI ||
    `amqp://${username}:${password}@${hostname}:${port}`
  );
}

export function getPostgresSetup() {
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USRE || 'postgres',
    password: process.env.DATABASE_PASS || 'password',
    database: process.env.DATABASE_NAME || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
  };
}

export function getPostgresURI() {
  const {host, user, database, port} = getPostgresSetup();
  return `postgresql://${user}@${host}:${port}/${database}`;
}

