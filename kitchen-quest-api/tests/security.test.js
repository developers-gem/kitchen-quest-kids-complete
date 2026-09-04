const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const env = require("../src/config/env");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerAndGetToken(email = parent.email) {
  const res = await request(app).post("/api/v1/auth/register").send({ ...parent, email });
  return { accessToken: res.body.data.accessToken, userId: res.body.data.user._id };
}

describe("Security: unauthorized access", () => {
  it("rejects any protected route with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/children");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects a malformed Authorization header (missing Bearer scheme)", async () => {
    const { accessToken } = await registerAndGetToken();
    const res = await request(app).get("/api/v1/children").set("Authorization", accessToken); // no "Bearer "
    expect(res.status).toBe(401);
  });

  it("rejects a syntactically invalid/garbage token", async () => {
    const res = await request(app).get("/api/v1/children").set("Authorization", "Bearer not.a.real.jwt.at.all");
    expect(res.status).toBe(401);
  });
});

describe("Security: token expiration", () => {
  it("rejects an access token that is genuinely expired, not just malformed", async () => {
    const { userId } = await registerAndGetToken();

    // Signed with the real secret and a real payload shape, but with a
    // negative expiry -- jsonwebtoken treats this as already-expired at
    // the moment of signing, which is the one scenario a "garbage token"
    // test (above) does NOT exercise: a token that is entirely
    // well-formed and correctly signed, just past its exp claim.
    const expiredToken = jwt.sign({ sub: userId, role: ["parent"] }, env.JWT_ACCESS_SECRET, { expiresIn: -10 });

    const res = await request(app).get("/api/v1/children").set("Authorization", `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret (forged token attempt)", async () => {
    const { userId } = await registerAndGetToken();
    const forgedToken = jwt.sign({ sub: userId, role: ["parent"] }, "not-the-real-secret", { expiresIn: "15m" });

    const res = await request(app).get("/api/v1/children").set("Authorization", `Bearer ${forgedToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token for a user id that no longer exists", async () => {
    const fakeButValidLookingId = "507f1f77bcf86cd799439011";
    const tokenForNobody = jwt.sign({ sub: fakeButValidLookingId, role: ["parent"] }, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });

    const res = await request(app).get("/api/v1/children").set("Authorization", `Bearer ${tokenForNobody}`);
    expect(res.status).toBe(401);
  });
});

describe("Security: invalid input / injection attempts", () => {
  it("rejects a NoSQL-operator-injection login payload instead of coercing it to a string", async () => {
    // A classic NoSQL injection attempt against a hand-rolled query would
    // pass { email: { "$gt": "" }, password: { "$gt": "" } } hoping the
    // driver treats it as a query operator rather than a literal value.
    // zod's z.string() on the login schema rejects a non-string body
    // field outright with a 400 -- the request never reaches the
    // database layer at all.
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a NoSQL-operator-injection object passed as a query id parameter", async () => {
    const { accessToken } = await registerAndGetToken();
    // objectId validation (a 24-char hex string check) rejects this
    // before it can reach a Mongoose query as a filter value.
    const res = await request(app)
      .get("/api/v1/children/%5B%24ne%5D=null") // encoded "[$ne]=null" -- not a valid ObjectId shape
      .set("Authorization", `Bearer ${accessToken}`);
    expect([400, 404]).toContain(res.status);
  });

  it("stores and returns script-tag-like input as inert literal text, never executing or stripping it silently", async () => {
    // This is a JSON API, not a server-rendered HTML page, so there is no
    // template-injection surface here -- the correct behavior is simply
    // to store exactly what was sent and return it as data. Output-side
    // XSS protection is the web client's job (React escapes all rendered
    // text by default); this test asserts the API layer doesn't do
    // anything unsafe with the string itself (no crash, no silent
    // mutation, no server-side evaluation).
    const maliciousName = '<script>alert("xss")</script>';
    const res = await request(app).post("/api/v1/auth/register").send({
      ...parent,
      email: "scripttest@example.com",
      firstName: maliciousName,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.firstName).toBe(maliciousName);
  });

  it("rejects an oversized payload field instead of truncating silently", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      ...parent,
      email: "oversized@example.com",
      firstName: "A".repeat(10000),
    });
    // Whatever the exact limit, an absurdly long name must not be
    // silently accepted and truncated -- it should be a validation
    // rejection so the client knows the input was invalid.
    expect(res.status).toBe(400);
  });
});

describe("Security: rate limiting", () => {
  /**
   * The real app's authLimiter is deliberately set to a very high max in
   * the test environment (see tests/setup.js: AUTH_RATE_LIMIT_MAX is
   * raised so the hundred-plus other requests this suite makes to
   * /api/v1/auth/* don't spuriously trip it and fail unrelated tests).
   * That's the right call for test-suite stability, but it means we
   * can't exercise "does the limiter actually 429 past its max" against
   * the live app in this same process.
   *
   * Instead, this builds a tiny standalone Express app from the exact
   * same `makeLimiter` factory production code uses, configured with a
   * small max -- testing the real mechanism (express-rate-limit wiring,
   * the ApiError.tooManyRequests() shape) without fighting the
   * suite-wide override needed for everything else to run reliably.
   */
  it("returns 429 with the standard error envelope once a small limit is exceeded", async () => {
    const express = require("express");
    const { makeLimiter } = require("../src/middleware/rateLimiter");
    const { errorHandler } = require("../src/middleware/errorHandler");

    const testApp = express();
    const smallLimiter = makeLimiter({ windowMinutes: 15, max: 3 });
    testApp.use(smallLimiter);
    testApp.get("/probe", (req, res) => res.json({ success: true, data: { ok: true } }));
    testApp.use(errorHandler);

    const results = [];
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await request(testApp).get("/probe"));
    }

    expect(results.slice(0, 3).every((r) => r.status === 200)).toBe(true);
    expect(results[3].status).toBe(429);
    expect(results[3].body.success).toBe(false);
    expect(results[3].body.error.code).toBe("RATE_LIMITED");
  });

  it("applies a tighter limit to auth endpoints than the global default in real config", () => {
    // A configuration-level assertion, not a live-fire test: the auth
    // limiter must be stricter than the global one, since brute-forcing
    // credentials is a higher-value target than general API abuse.
    // Read from .env.example's documented intent since the live env
    // values are intentionally relaxed for this test run (see above).
    const fs = require("fs");
    const path = require("path");
    const exampleEnv = fs.readFileSync(path.join(__dirname, "../.env.example"), "utf8");
    const authMax = Number(exampleEnv.match(/AUTH_RATE_LIMIT_MAX=(\d+)/)[1]);
    const globalMax = Number(exampleEnv.match(/^RATE_LIMIT_MAX=(\d+)/m)[1]);
    expect(authMax).toBeLessThan(globalMax);
  });
});
