/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Business logic validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, identifier });
  }
}

/**
 * Insufficient balance error (400)
 */
export class InsufficientBalanceError extends AppError {
  constructor(
    public accountId: string,
    public required: string,
    public available: string
  ) {
    super(
      `Insufficient balance. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_BALANCE',
      400,
      { accountId, required, available }
    );
  }
}

/**
 * Invalid amount error (400)
 */
export class InvalidAmountError extends AppError {
  constructor(amount: string) {
    super(
      `Invalid amount: ${amount}. Amount must be positive.`,
      'INVALID_AMOUNT',
      400,
      { amount }
    );
  }
}

/**
 * Currency not found error (404)
 */
export class CurrencyNotFoundError extends AppError {
  constructor(communityId: string, currencyCode: string) {
    super(
      `Currency '${currencyCode}' not found in community '${communityId}'`,
      'CURRENCY_NOT_FOUND',
      404,
      { communityId, currencyCode }
    );
  }
}

/**
 * Account not found error (404)
 */
export class AccountNotFoundError extends AppError {
  constructor(accountRef: { ownerType: string; ownerRef: string }) {
    super(
      `Account not found: ${accountRef.ownerType}:${accountRef.ownerRef}`,
      'ACCOUNT_NOT_FOUND',
      404,
      { accountRef }
    );
  }
}

/**
 * Conflict error (409) - for duplicate resources
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends AppError {
  constructor(
    public limit: number,
    public window: string,
    public retryAfter?: number
  ) {
    super(
      `Rate limit exceeded. Limit: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, window, retryAfter }
    );
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `External service error: ${service} - ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service }
    );
  }
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error) {
  if (isAppError(error)) {
    return {
      error: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  // Unknown error - don't leak internal details in production
  return {
    error: 'InternalServerError',
    code: 'INTERNAL_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : error.message,
    statusCode: 500,
  };
}
