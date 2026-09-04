const request = require("supertest");
const mongoose = require("mongoose");
const createApp = require("../src/app");

const app = createApp();

describe("Health check", () => {
  it("reports healthy with 200 when the database connection is up", async () => {
    // The test suite's fake models bypass a real Mongoose connection, so
    // this simulates the connected state directly on the shared
    // mongoose.connection object the health check reads.
    const originalState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });

    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.database).toBe("connected");

    Object.defineProperty(mongoose.connection, "readyState", { value: originalState, configurable: true });
  });

  it("reports degraded with 503 when the database is disconnected -- never a false-positive 'ok'", async () => {
    const originalState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", { value: 0, configurable: true });

    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe("degraded");
    expect(res.body.data.database).toBe("disconnected");

    Object.defineProperty(mongoose.connection, "readyState", { value: originalState, configurable: true });
  });

  it("is also mounted at the root, version-independent path for infra health probes", async () => {
    const originalState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");

    Object.defineProperty(mongoose.connection, "readyState", { value: originalState, configurable: true });
  });
});
