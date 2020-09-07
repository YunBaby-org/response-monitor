export class AmqpConnectionFailureException implements Error {
  constructor(message: string) {
    this.message = message;
    this.name = this.constructor.name;
  }
  message: string;
  name: string;
}
