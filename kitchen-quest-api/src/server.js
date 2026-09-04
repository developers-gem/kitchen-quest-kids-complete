const env = require("./config/env");
const { connectDB, disconnectDB } = require("./config/db");
const { init: initErrorTracking, captureException } = require("./config/errorTracking");
const createApp = require("./app");

initErrorTracking();

/**
 * FIXED (production readiness audit, findings D4/D5): this file used to
 * have no graceful shutdown and no process-level exception handlers.
 * Two concrete problems that caused in practice:
 *   - A container orchestrator's rolling deploy sends SIGTERM and expects
 *     the process to stop accepting new connections, finish in-flight
 *     requests, close the DB connection, and exit -- without a handler,
 *     the process would be hard-killed after the orchestrator's grace
 *     period, abandoning in-flight requests mid-response.
 *   - An unexpected synchronous throw or an unhandled promise rejection
 *     outside Express's request cycle (a stray `.then()` without
 *     `.catch()` somewhere, for instance) would previously either crash
 *     the process with no log context or, worse, leave it running in an
 *     undefined state. Both are now logged loudly and treated as fatal
 *     (Node's own guidance: an unhandled rejection means the app is in a
 *     state it never anticipated, so exiting and letting the
 *     orchestrator restart it cleanly is safer than limping on).
 */
async function start() {
  await connectDB();
  const app = createApp();
  const port = Number(env.PORT);

  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Kitchen Quest Kids API listening on port ${port} [${env.NODE_ENV}]`);
  });

  const SHUTDOWN_TIMEOUT_MS = 10000;

  async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received: starting graceful shutdown...`);

    const forceExitTimer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error("Graceful shutdown timed out -- forcing exit.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    server.close(async (err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error("Error while closing HTTP server:", err);
      }
      try {
        await disconnectDB();
        // eslint-disable-next-line no-console
        console.log("Shutdown complete.");
        clearTimeout(forceExitTimer);
        process.exit(err ? 1 : 0);
      } catch (disconnectErr) {
        // eslint-disable-next-line no-console
        console.error("Error while disconnecting MongoDB:", disconnectErr);
        clearTimeout(forceExitTimer);
        process.exit(1);
      }
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("Fatal: unhandled promise rejection:", reason);
  captureException(reason instanceof Error ? reason : new Error(String(reason)), { source: "unhandledRejection" });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal: uncaught exception:", err);
  captureException(err, { source: "uncaughtException" });
  process.exit(1);
});

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
