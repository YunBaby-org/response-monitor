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

export function getURI() {
  const username = getUsername();
  const password = getPasswordSync();
  const hostname = getRabbitHost();
  const port = getRabbitPort();
  return (
    process.env.RABBITMQ_URI ||
    `amqp://${username}:${password}@${hostname}:${port}`
  );
}
