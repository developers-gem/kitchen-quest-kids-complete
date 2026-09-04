/**
 * Every successful response uses this shape:
 * { success: true, data: {...}, meta: {...} }
 * Errors use the mirrored shape produced by the errorHandler middleware.
 */
function sendSuccess(res, { statusCode = 200, data = null, meta = undefined, message = undefined } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  if (message !== undefined) body.message = message;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess };
