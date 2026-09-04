const request = require("supertest");
const createApp = require("../src/app");

const app = createApp();

const validUser = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

describe("Auth: register", () => {
  it("creates an account and returns tokens + user + organization", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.organization.type).toBe("family");
    expect(res.body.data.user.organizationId).toBe(res.body.data.organization._id);
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);
    const res = await request(app).post("/api/v1/auth/register").send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects registration without consent acknowledgment", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validUser, email: "other@example.com", consentAcknowledged: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a weak password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validUser, email: "weak@example.com", password: "weak" });
    expect(res.status).toBe(400);
  });
});

describe("Auth: login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects wrong password without leaking which part was wrong", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: "WrongPass123" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });

  it("rejects login for a nonexistent email with the same generic message", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "WrongPass123" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });
});

describe("Auth: refresh token rotation", () => {
  it("rotates the refresh token and rejects reuse of the old one", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send(validUser);
    const firstRefreshToken = registerRes.body.data.refreshToken;

    const refreshRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: firstRefreshToken });
    expect(refreshRes.status).toBe(200);
    const secondRefreshToken = refreshRes.body.data.refreshToken;
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // Reusing the now-rotated-away first token must fail (theft/replay detection)
    const reuseRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: firstRefreshToken });
    expect(reuseRes.status).toBe(401);

    // Because reuse triggers a full session wipe, the second (legitimately
    // rotated) token should now also be rejected.
    const secondUseRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: secondRefreshToken });
    expect(secondUseRes.status).toBe(401);
  });

  it("rejects an invalid/garbage refresh token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: "not-a-real-token" });
    expect(res.status).toBe(401);
  });
});

describe("Auth: logout", () => {
  it("revokes the refresh token so it can no longer be used", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send(validUser);
    const refreshToken = registerRes.body.data.refreshToken;

    const logoutRes = await request(app).post("/api/v1/auth/logout").send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });
});

describe("Auth: forgot / reset password", () => {
  it("always responds success for forgot-password regardless of email existing (no enumeration)", async () => {
    const res1 = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(res1.status).toBe(200);

    await request(app).post("/api/v1/auth/register").send(validUser);
    const res2 = await request(app).post("/api/v1/auth/forgot-password").send({ email: validUser.email });
    expect(res2.status).toBe(200);
  });

  it("rejects an invalid reset token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "garbage", password: "NewStrongPass123" });
    expect(res.status).toBe(400);
  });
});

describe("Auth: parental gate", () => {
  it("issues a challenge and accepts the correct answer, then rejects a wrong one", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send(validUser);
    const accessToken = registerRes.body.data.accessToken;

    const challengeRes = await request(app)
      .post("/api/v1/auth/parental-gate/challenge")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(challengeRes.status).toBe(200);
    const { question, challengeToken } = challengeRes.body.data;
    const [a, , b] = question.split(" ");
    const correctAnswer = Number(a) * Number(b);

    const wrongRes = await request(app)
      .post("/api/v1/auth/parental-gate/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ challengeToken, answer: correctAnswer + 1 });
    expect(wrongRes.status).toBe(400);

    const correctRes = await request(app)
      .post("/api/v1/auth/parental-gate/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ challengeToken, answer: correctAnswer });
    expect(correctRes.status).toBe(200);
    expect(correctRes.body.data.gateToken).toEqual(expect.any(String));
  });

  it("requires authentication to request a challenge", async () => {
    const res = await request(app).post("/api/v1/auth/parental-gate/challenge");
    expect(res.status).toBe(401);
  });
});
