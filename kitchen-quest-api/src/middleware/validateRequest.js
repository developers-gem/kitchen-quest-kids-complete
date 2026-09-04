const ApiError = require("../utils/ApiError");

/**
 * Usage: validateRequest({ body: schema, query: schema, params: schema })
 * Runs before the controller; rejected requests never reach business logic.
 * On success, replaces req.body/query/params with the *parsed* (and
 * type-coerced/defaulted) data so controllers can trust its shape.
 */
function validateRequest(schemas = {}) {
  return function (req, res, next) {
    try {
      for (const key of ["params", "query", "body"]) {
        const schema = schemas[key];
        if (!schema) continue;
        const result = schema.safeParse(req[key]);
        if (!result.success) {
          const details = result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          }));
          throw ApiError.badRequest("Request validation failed", details);
        }
        req[key] = result.data;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validateRequest;
