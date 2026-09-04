const mongoose = require("mongoose");

/**
 * FIXED (production readiness audit, finding B3): this used to return
 * `{status: "ok"}` unconditionally, regardless of whether MongoDB was
 * actually reachable. A load balancer or orchestrator using it as a
 * readiness/liveness probe would have reported the service healthy even
 * while the database was down -- exactly the false-positive that turns a
 * database outage into a much worse, harder-to-diagnose incident.
 *
 * `mongoose.connection.readyState` values: 0 disconnected, 1 connected,
 * 2 connecting, 3 disconnecting. Only `1` counts as healthy for a
 * readiness check -- "connecting" is a real state during a reconnect
 * attempt and should report unhealthy until it resolves, not be treated
 * as good enough.
 */
function getHealthStatus() {
  const dbConnected = mongoose.connection.readyState === 1;
  return {
    healthy: dbConnected,
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
  };
}

function healthCheckHandler(req, res) {
  const health = getHealthStatus();
  const statusCode = health.healthy ? 200 : 503;
  res.status(statusCode).json({
    success: health.healthy,
    data: { status: health.status, database: health.database },
  });
}

module.exports = { getHealthStatus, healthCheckHandler };
