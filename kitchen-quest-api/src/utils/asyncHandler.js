/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * the global error handler instead of crashing the process / hanging.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
