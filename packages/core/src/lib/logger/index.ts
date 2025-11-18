import pino from 'pino';

// Configure logger based on environment
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export type LogContext = {
  requestId?: string;
  userId?: string;
  communityId?: string;
  accountId?: string;
  transactionId?: string;
  [key: string]: any;
};

/**
 * Create a child logger with additional context
 */
export function createLogger(context: LogContext) {
  return logger.child(context);
}

/**
 * Log an info message with context
 */
export function logInfo(message: string, context?: LogContext) {
  logger.info(context || {}, message);
}

/**
 * Log a warning with context
 */
export function logWarning(message: string, context?: LogContext) {
  logger.warn(context || {}, message);
}

/**
 * Log an error with context
 */
export function logError(message: string, error?: Error, context?: LogContext) {
  if (error) {
    logger.error({ ...context, err: error }, message);
  } else {
    logger.error(context || {}, message);
  }
}

/**
 * Log a debug message with context
 */
export function logDebug(message: string, context?: LogContext) {
  logger.debug(context || {}, message);
}

/**
 * Get the root logger instance
 */
export function getLogger() {
  return logger;
}

export default logger;
