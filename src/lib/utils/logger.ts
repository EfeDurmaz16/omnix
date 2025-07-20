/**
 * Centralized logging system with level control
 * Reduces debug noise and provides structured logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

interface LogContext {
  component?: string;
  userId?: string;
  chatId?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private enabledComponents: Set<string>;

  constructor() {
    // Default to INFO in production, DEBUG in development
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    
    // Override with environment variable
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && LogLevel[envLevel as keyof typeof LogLevel] !== undefined) {
      this.level = LogLevel[envLevel as keyof typeof LogLevel];
    }

    // Only log specific components if specified
    const enabledComponents = process.env.LOG_COMPONENTS?.split(',') || [];
    this.enabledComponents = new Set(enabledComponents.map(c => c.trim()));
  }

  private shouldLog(level: LogLevel, component?: string): boolean {
    if (level > this.level) return false;
    if (this.enabledComponents.size > 0 && component && !this.enabledComponents.has(component)) {
      return false;
    }
    return true;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const component = context?.component ? `[${context.component}]` : '';
    const operation = context?.operation ? `${context.operation}:` : '';
    
    return `${timestamp} ${level} ${component} ${operation} ${message}`;
  }

  private logWithContext(level: LogLevel, levelName: string, message: string, context?: LogContext, data?: any) {
    if (!this.shouldLog(level, context?.component)) return;

    const formattedMessage = this.formatMessage(levelName, message, context);
    
    if (data) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  }

  error(message: string, context?: LogContext, data?: any) {
    this.logWithContext(LogLevel.ERROR, '❌ ERROR', message, context, data);
  }

  warn(message: string, context?: LogContext, data?: any) {
    this.logWithContext(LogLevel.WARN, '⚠️  WARN', message, context, data);
  }

  info(message: string, context?: LogContext, data?: any) {
    this.logWithContext(LogLevel.INFO, 'ℹ️  INFO', message, context, data);
  }

  debug(message: string, context?: LogContext, data?: any) {
    this.logWithContext(LogLevel.DEBUG, '🔍 DEBUG', message, context, data);
  }

  trace(message: string, context?: LogContext, data?: any) {
    this.logWithContext(LogLevel.TRACE, '📍 TRACE', message, context, data);
  }

  // Specialized logging methods for common operations
  memory(message: string, data?: any, userId?: string) {
    this.debug(message, { component: 'memory', userId }, data);
  }

  stream(message: string, data?: any, chatId?: string) {
    this.debug(message, { component: 'stream', chatId }, data);
  }

  context(message: string, data?: any, contextId?: string) {
    this.debug(message, { component: 'context', operation: contextId }, data);
  }

  embedding(message: string, data?: any) {
    this.debug(message, { component: 'embedding' }, data);
  }

  cache(message: string, data?: any) {
    this.debug(message, { component: 'cache' }, data);
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext) {
    if (duration > 1000) {
      this.warn(`Slow operation: ${operation} took ${duration}ms`, context);
    } else {
      this.debug(`${operation} completed in ${duration}ms`, context);
    }
  }

  // Batch logging for related operations
  group(label: string, fn: () => void) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(`🔄 ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for backward compatibility
export const log = {
  error: (msg: string, data?: any) => logger.error(msg, undefined, data),
  warn: (msg: string, data?: any) => logger.warn(msg, undefined, data),
  info: (msg: string, data?: any) => logger.info(msg, undefined, data),
  debug: (msg: string, data?: any) => logger.debug(msg, undefined, data),
  memory: (msg: string, data?: any) => logger.memory(msg, data),
  stream: (msg: string, data?: any) => logger.stream(msg, data),
  context: (msg: string, data?: any) => logger.context(msg, data),
  performance: (op: string, duration: number) => logger.performance(op, duration)
};