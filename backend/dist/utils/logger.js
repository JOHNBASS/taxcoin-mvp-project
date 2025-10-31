import winston from 'winston';
import { config } from '../config/index.js';
const customFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
        ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
        : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
}));
export const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: customFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), customFormat),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 10,
        }),
    ],
});
if (config.nodeEnv === 'development') {
    logger.clear();
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), customFormat),
    }));
}
//# sourceMappingURL=logger.js.map