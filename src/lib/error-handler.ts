/**
 * Error handling utilities for consistent error management
 */

import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Parse Supabase error and return user-friendly message
 */
export function parseSupabaseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Foreign key violation
    if (message.includes("foreign key")) {
      return new AppError(
        "Cannot delete: this item is referenced elsewhere",
        "FOREIGN_KEY_VIOLATION",
        400,
      );
    }

    // Unique constraint violation
    if (message.includes("unique")) {
      return new AppError("This record already exists", "UNIQUE_VIOLATION", 400);
    }

    // Timeout
    if (message.includes("timeout")) {
      return new AppError("Request took too long. Please try again.", "TIMEOUT", 408);
    }

    // Authentication errors
    if (
      message.includes("auth") ||
      message.includes("unauthorized") ||
      message.includes("unauthenticated")
    ) {
      return new AppError("Authentication failed", "AUTH_ERROR", 401);
    }

    // Permission errors
    if (message.includes("permission") || message.includes("forbidden")) {
      return new AppError("You don't have permission", "PERMISSION_ERROR", 403);
    }

    // Generic database error
    return new AppError("Database operation failed", "DB_ERROR", 500, {
      originalMessage: error.message,
    });
  }

  // Unknown error
  return new AppError("An unexpected error occurred", "UNKNOWN_ERROR", 500, {
    originalError: String(error),
  });
}

/**
 * Safe async wrapper that catches and logs errors
 */
export async function safeAsync<T>(fn: () => Promise<T>, context?: string): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError = parseSupabaseError(error);
    logger.error(
      context ? `${context}: ${appError.message}` : appError.message,
      error instanceof Error ? error : new Error(String(error)),
      { code: appError.code, status: appError.status },
    );
    throw appError;
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    // Timeouts and server errors are recoverable
    return error.status === 408 || error.status >= 500;
  }
  return true;
}
