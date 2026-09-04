describe("Rate limiter: store selection", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it("falls back to express-rate-limit's own in-memory store when REDIS_URL is unset", () => {
    delete process.env.REDIS_URL;
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { makeLimiter } = require("../src/middleware/rateLimiter");

    const limiter = makeLimiter({ windowMinutes: 15, max: 10, storePrefix: "test-memory" });
    // express-rate-limit assigns its own default MemoryStore internally
    // when no `store` option is passed -- this just confirms building a
    // limiter with REDIS_URL unset doesn't throw or require a live Redis
    // connection.
    expect(typeof limiter).toBe("function");
  });

  it("does not attempt a Redis connection at all when REDIS_URL is unset", () => {
    delete process.env.REDIS_URL;
    jest.resetModules();
    jest.doMock("ioredis", () => {
      throw new Error("ioredis should never be required when REDIS_URL is unset");
    });
    // eslint-disable-next-line global-require
    const { makeLimiter } = require("../src/middleware/rateLimiter");
    expect(() => makeLimiter({ windowMinutes: 15, max: 10, storePrefix: "test-no-redis" })).not.toThrow();
    jest.dontMock("ioredis");
  });
});
