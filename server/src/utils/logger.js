const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'kisanlens-api' },
  transports: [
    new winston.transports.Console({
      format: config.isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...rest }) => {
              const meta = Object.keys(rest).length > 1 ? JSON.stringify(rest) : '';
              return `${timestamp} [${level}]: ${message} ${meta}`;
            })
          ),
    }),
  ],
});

module.exports = logger;
