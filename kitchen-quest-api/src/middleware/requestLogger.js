const morgan = require("morgan");
const env = require("../config/env");

/** Verbose in development, minimal in production (a real deployment would
 * pipe this to a log aggregator instead of stdout). */
function requestLogger() {
  if (env.NODE_ENV === "test") {
    return (req, res, next) => next(); // silence logs during tests
  }
  return morgan(env.NODE_ENV === "production" ? "combined" : "dev");
}

module.exports = requestLogger;
