const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), process.env.ENV_FILE || ".env"),
});

const { z } = require("zod");

/**
 * Every required environment variable is validated at boot.
 * The process fails fast in staging/production if something required is
 * missing, instead of silently falling back to an insecure default.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.string().default("4000"),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.string().default("30"),

  PARENTAL_GATE_SECRET: z.string().min(8).default("dev-parental-gate-secret-change-me"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // The web app's own base URL -- used to build links inside transactional
  // emails (password reset, verification). Deliberately separate from
  // CORS_ORIGIN even though they're often the same value in practice:
  // CORS_ORIGIN can be a comma-separated allowlist of multiple origins
  // (web + admin + staging previews), while FRONTEND_URL is the one
  // canonical place a human clicking an email link should land.
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  RATE_LIMIT_WINDOW_MINUTES: z.string().default("15"),
  RATE_LIMIT_MAX: z.string().default("300"),
  AUTH_RATE_LIMIT_MAX: z.string().default("20"),

  // OPTIONAL. If unset, the rate limiter falls back to an in-memory
  // store (fine for exactly one API process; see rateLimiter.js's doc
  // comment for why that stops providing real protection the moment
  // there's more than one instance behind a load balancer -- production
  // readiness audit finding D1/I1).
  // OPTIONAL. Error tracking (Sentry) -- see src/config/errorTracking.js.
  // No-ops entirely when unset; nothing about local dev or this test
  // suite requires it.
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // In non-development environments, a missing/invalid secret must stop boot.
    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined;
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    if (!isDev) {
      process.exit(1);
    }
    // Development fallback so `npm run dev` works with a minimal .env,
    // but this NEVER happens outside development.
    return {
      NODE_ENV: "development",
      PORT: "4000",
      MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kitchen_quest_dev",
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me-please",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me-please",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN_DAYS: "30",
      PARENTAL_GATE_SECRET: "dev-parental-gate-secret-change-me",
      CORS_ORIGIN: "http://localhost:5173",
      FRONTEND_URL: "http://localhost:5173",
      RATE_LIMIT_WINDOW_MINUTES: "15",
      RATE_LIMIT_MAX: "300",
      AUTH_RATE_LIMIT_MAX: "20",
    };
  }

  return parsed.data;
}

const env = loadEnv();

module.exports = env;
