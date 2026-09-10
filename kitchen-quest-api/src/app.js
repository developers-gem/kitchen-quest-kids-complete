// const express = require("express");
// const helmet = require("helmet");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// const mongoSanitize = require("express-mongo-sanitize");

// const env = require("./config/env");
// const requestLogger = require("./middleware/requestLogger");
// const { globalLimiter } = require("./middleware/rateLimiter");
// const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
// const { healthCheckHandler } = require("./utils/healthCheck");
// const v1Router = require("./routes/v1");

// function createApp() {
//   const app = express();

//   // Secure headers
//   app.use(helmet());

//   // Root-level health check (in addition to /api/v1/health) -- many load
//   // balancers/orchestrators (ALB target groups, k8s liveness/readiness
//   // probes) expect a fixed, version-independent path and shouldn't need
//   // to know this API is currently on v1. Mounted before CORS/rate
//   // limiting/auth so infrastructure health checks are never themselves
//   // rate-limited or blocked by an origin check.
//   app.get("/health", healthCheckHandler);

//   // CORS — restricted to the configured web/mobile origin(s); credentials
//   // enabled since the web client relies on the httpOnly refresh cookie.
//   app.use(
//     cors({
//       origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
//       credentials: true,
//     })
//   );

//   app.use(express.json({ limit: "1mb" }));
//   app.use(express.urlencoded({ extended: true }));
//   app.use(cookieParser());

//   // Strips any key starting with "$" or containing "." from
//   // req.body/query/params — the standard NoSQL/MongoDB injection guard.
//   app.use(mongoSanitize());

//   app.use(requestLogger());
//   app.use(globalLimiter);

//   app.use("/api/v1", v1Router);

//   app.use(notFoundHandler);
//   app.use(errorHandler);

//   return app;
// }

// module.exports = createApp;
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

// Import your User model (adjust relative path if located elsewhere)
const User = require("./modules/users/user.model");

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
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
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

  // ---------------------------------------------------------------------------
  // Direct Public Account Deletion Endpoint (No Auth Required)
  // ---------------------------------------------------------------------------
  app.post("/api/v1/delete-account", async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email address is required.",
          },
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOneAndUpdate(
        {
          email: normalizedEmail,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
        {
          $set: {
            deletedAt: new Date(),
            status: "deleted",
            isActive: false,
          },
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "No active account found with this email address.",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          message: "Account deletion initiated successfully.",
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  // Main API Router
  app.use("/api/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;