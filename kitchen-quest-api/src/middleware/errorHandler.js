const ApiError = require("../utils/ApiError");
const env = require("../config/env");
const { captureException } = require("../config/errorTracking");

/**
 * Every error in the app funnels here (via next(err) or async rejections
 * caught by asyncHandler). Normalizes Mongoose/JWT/unexpected errors into
 * the same ApiError shape so clients only ever deal with one error format.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === "ValidationError") {
      // Mongoose validation error
      const details = Object.values(error.errors || {}).map((e) => ({
        path: e.path,
        message: e.message,
      }));
      error = ApiError.badRequest("Validation failed", details);
    } else if (error.code === 11000) {
      // Mongo duplicate key
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      error = ApiError.conflict(`A record with this ${field} already exists`);
    } else if (error.name === "CastError") {
      error = ApiError.badRequest(`Invalid value for ${error.path}`);
    } else {
      error = ApiError.internal(env.NODE_ENV === "production" ? "Something went wrong" : error.message);
    }
  }

  if (!error.isOperational) {
    captureException(err, { path: req.originalUrl, method: req.method });
  }

  const body = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details) body.error.details = error.details;
  if (env.NODE_ENV !== "production" && err.stack && !error.isOperational) {
    body.error.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(body);
}

/** 404 handler for unmatched routes — placed after all routers. */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
