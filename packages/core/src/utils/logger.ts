/**
 * Structured logging with winston
 */

import winston from 'winston';

export interface LoggerContext {
  runId?: string;
  pipelineId?: string;
  stageId?: string;
  [key: string]: any;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'llmops' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Add file transport if LOG_FILE is set
if (process.env.LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      level: 'info',
    })
  );
}

// Add error log file
if (process.env.ERROR_LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.ERROR_LOG_FILE,
      level: 'error',
    })
  );
}

/**
 * Create a context-aware logger
 */
export function createContextLogger(context: LoggerContext): winston.Logger {
  return logger.child(context);
}

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Utility functions
 */
export function logError(error: Error, context?: LoggerContext): void {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}

export function logInfo(message: string, context?: LoggerContext): void {
  logger.info(message, context);
}

export function logDebug(message: string, context?: LoggerContext): void {
  logger.debug(message, context);
}

export function logWarn(message: string, context?: LoggerContext): void {
  logger.warn(message, context);
}
