import winston from 'winston';

const isProduction = (process.env.NODE_ENV || '') === 'PRODUCTION';

function winstonFormat(label: string) {
  if (isProduction) return winston.format.json();
  else
    return winston.format.combine(
      winston.format.colorize(),
      winston.format.label({label: label}),
      winston.format.timestamp(),
      winston.format.printf(({level, message, label, timestamp}) => {
        return `${timestamp} [${label}] ${level}: ${message}`;
      }),
      winston.format.metadata()
    );
}

export const appLogger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  transports: [new winston.transports.Console()],
  format: winstonFormat('response-monitor'),
});
