const env = require("./env");

/**
 * FIXED (production readiness audit, finding D2): the only error
 * visibility this API had was `console.error`, which is invisible in
 * production unless someone is actively tailing logs at the exact
 * moment something breaks. This wraps Sentry behind the same
 * optional-env-var pattern as the Redis-backed rate limiter
 * (rateLimiter.js) and the retry-enabled DB connection (config/db.js):
 * fully functional when configured, a safe, silent no-op when not, so
 * neither local development nor this test suite needs a real Sentry
 * project to exist.
 */
let sentry = null;

function init() {
  if (!env.SENTRY_DSN) return;
  if (sentry) return; // already initialized
  // eslint-disable-next-line global-require
  sentry = require("@sentry/node");
  sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Errors only, not performance tracing -- tracing has its own cost/
    // sampling tradeoffs worth deciding deliberately later rather than
    // defaulting on.
    tracesSampleRate: 0,
  });
}

function captureException(err, context = {}) {
  if (!sentry) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error (Sentry not configured):", err);
    return;
  }
  sentry.captureException(err, { extra: context });
}

module.exports = { init, captureException };
