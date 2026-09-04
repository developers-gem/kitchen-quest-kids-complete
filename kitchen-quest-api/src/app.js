const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const env = require("./config/env");
const requestLogger = require("./middleware/requestLogger");
const { globalLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { healthCheckHandler } = require("./utils/healthCheck");
const v1Router = require("./routes/v1");

function createApp() {
  const app = express();

  // Secure headers
  app.use(helmet());

  // Root-level health check (in addition to /api/v1/health) -- many load
  // balancers/orchestrators (ALB target groups, k8s liveness/readiness
  // probes) expect a fixed, version-independent path and shouldn't need
  // to know this API is currently on v1. Mounted before CORS/rate
  // limiting/auth so infrastructure health checks are never themselves
  // rate-limited or blocked by an origin check.
  app.get("/health", healthCheckHandler);

  // CORS — restricted to the configured web/mobile origin(s); credentials
  // enabled since the web client relies on the httpOnly refresh cookie.
  app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://kitchen-quest-kids-complete.vercel.app",
    ],
    credentials: true,
  })
);

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Strips any key starting with "$" or containing "." from
  // req.body/query/params — the standard NoSQL/MongoDB injection guard.
  app.use(mongoSanitize());

  app.use(requestLogger());
  app.use(globalLimiter);

  app.use("/api/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
