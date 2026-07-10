/**
 * Structured logging utility for production debugging
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDev = import.meta.env.DEV;

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      error,
    };
  }

  private log(entry: LogEntry) {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const timestamp = entry.timestamp;

    if (this.isDev) {
      // Development: Pretty print to console
      console.log(
        `%c${prefix} ${timestamp} ${entry.message}`,
        `color: ${this.getColor(entry.level)}; font-weight: bold;`,
        entry.context,
        entry.error,
      );
    } else {
      // Production: JSON structured logging
      console.log(JSON.stringify(entry));
    }
  }

  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: "gray",
      info: "blue",
      warn: "orange",
      error: "red",
    };
    return colors[level];
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDev) {
      this.log(this.formatEntry("debug", message, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log(this.formatEntry("info", message, context));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log(this.formatEntry("warn", message, context));
  }

  /**
   * Log error with error object
   */
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log(this.formatEntry("error", message, context, error));
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, url: string, context?: Record<string, unknown>) {
    this.debug(`API Request: ${method} ${url}`, context);
  }

  /**
   * Log API response
   */
  logApiResponse(method: string, url: string, status: number, duration: number) {
    this.debug(`API Response: ${method} ${url} ${status} (${duration}ms)`);
  }

  /**
   * Log API error
   */
  logApiError(method: string, url: string, error: Error, context?: Record<string, unknown>) {
    this.error(`API Error: ${method} ${url}`, error, context);
  }
}

export const logger = new Logger();
