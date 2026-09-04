/**
 * Standard application error. Thrown from services/controllers and caught
 * by the global error handler middleware, which maps it to the standard
 * response envelope.
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // stable machine-readable string clients can branch on
    this.details = details;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Resource conflict") {
    return new ApiError(409, "CONFLICT", message);
  }

  static tooManyRequests(message = "Too many requests, please try again later") {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Something went wrong") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

module.exports = ApiError;
