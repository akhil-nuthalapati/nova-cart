/**
 * Nova Cart — Domain Error & Result Primitives
 * Functional, type-safe error handling for core business logic.
 */

export type Result<T, E = DomainError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E extends DomainError>(error: E): Result<never, E> {
  return { success: false, error };
}

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
}

export class DataQualityBlockError extends DomainError {
  readonly code = 'DATA_QUALITY_BLOCK';
  readonly httpStatus = 422;
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;
}

export class BudgetExceededError extends DomainError {
  readonly code = 'BUDGET_EXCEEDED';
  readonly httpStatus = 422;
}
