const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

/**
 * FIXED (production readiness audit, findings D1/I1): this used to
 * always use express-rate-limit's default in-memory store. That store
 * keeps its counters in the process's own memory -- correct and simple
 * for exactly one API instance, but silently wrong the moment there's
 * more than one (the normal case in production behind a load balancer):
 * each instance tracks its own independent count, so five instances
 * each allowing 20 requests/15min means an attacker effectively gets
 * 100 requests/15min, not 20. This is a *correctness* regression, not
 * just a performance one -- it quietly weakens brute-force protection on
 * login/register without any error or warning.
 *
 * Fix: when REDIS_URL is configured, every instance shares one counter
 * via Redis, so the configured limit means what it says regardless of
 * how many instances are running. When REDIS_URL is unset (local dev,
 * or a deliberate single-instance deployment), this falls back to the
 * in-memory store exactly as before -- nothing breaks for a launch that
 * hasn't provisioned Redis yet, but scaling past one instance without
 * setting REDIS_URL first is now a conscious choice, not an invisible one.
 */
let sharedRedisClient = null;

function getRedisClient() {
  if (!env.REDIS_URL) return null;
  if (!sharedRedisClient) {
    // eslint-disable-next-line global-require
    const Redis = require("ioredis");
    sharedRedisClient = new Redis(env.REDIS_URL, {
      // Rate limiting should degrade gracefully, not take the whole API
      // down if Redis has a blip -- a modest retry strategy rather than
      // ioredis's default of retrying forever with no cap.
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    sharedRedisClient.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("Rate limiter Redis connection error:", err.message);
    });
  }
  return sharedRedisClient;
}

function buildStore(prefix) {
  const redis = getRedisClient();
  if (!redis) return undefined; // express-rate-limit's own in-memory default

  // eslint-disable-next-line global-require
  const RedisStore = require("rate-limit-redis").default || require("rate-limit-redis");
  return new RedisStore({
    prefix: `kqk:ratelimit:${prefix}:`,
    sendCommand: (...args) => redis.call(...args),
  });
}

function makeLimiter({ windowMinutes, max, storePrefix = "default" }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore(storePrefix),
    handler: (req, res, next) => next(ApiError.tooManyRequests()),
  });
}

/** Generous global default. */
const globalLimiter = makeLimiter({
  windowMinutes: Number(env.RATE_LIMIT_WINDOW_MINUTES),
  max: Number(env.RATE_LIMIT_MAX),
  storePrefix: "global",
});

/** Tighter limiter for auth endpoints (login, register, password reset)
 * to blunt brute-force / credential-stuffing attempts. */
const authLimiter = makeLimiter({
  windowMinutes: Number(env.RATE_LIMIT_WINDOW_MINUTES),
  max: Number(env.AUTH_RATE_LIMIT_MAX),
  storePrefix: "auth",
});

module.exports = { globalLimiter, authLimiter, makeLimiter };
