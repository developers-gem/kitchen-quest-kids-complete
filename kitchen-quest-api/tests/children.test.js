const request = require("supertest");
const createApp = require("../src/app");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerAndLogin() {
  const res = await request(app).post("/api/v1/auth/register").send(parent);
  return res.body.data.accessToken;
}

async function getGateToken(accessToken) {
  const challengeRes = await request(app)
    .post("/api/v1/auth/parental-gate/challenge")
    .set("Authorization", `Bearer ${accessToken}`);
  const { question, challengeToken } = challengeRes.body.data;
  const [a, , b] = question.split(" ");
  const answer = Number(a) * Number(b);
  const verifyRes = await request(app)
    .post("/api/v1/auth/parental-gate/verify")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ challengeToken, answer });
  return verifyRes.body.data.gateToken;
}

describe("Child profiles", () => {
  let accessToken;
  let gateToken;

  beforeEach(async () => {
    accessToken = await registerAndLogin();
    gateToken = await getGateToken(accessToken);
  });

  it("rejects child creation without the parental gate", async () => {
    const res = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ displayName: "Mia", ageRange: "7-9" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PARENTAL_GATE_REQUIRED");
  });

  it("creates a child profile with a valid gate token", async () => {
    const res = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "Mia", ageRange: "7-9" });
    expect(res.status).toBe(201);
    expect(res.body.data.displayName).toBe("Mia");
    expect(res.body.data.currentLevel).toBe(1);
    expect(res.body.data.totalXP).toBe(0);
    // no email/password field should ever exist on a child profile
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("never returns allergies in a normal list/read (select:false)", async () => {
    await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({
        displayName: "Mia",
        ageRange: "7-9",
        preferences: { allergies: ["peanuts"] },
      });

    const listRes = await request(app).get("/api/v1/children").set("Authorization", `Bearer ${accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data[0].preferences.allergies).toBeUndefined();
  });

  it("lists only children belonging to the authenticated family", async () => {
    await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "Mia", ageRange: "7-9" });

    const otherParent = { ...parent, email: "other@example.com" };
    const otherRes = await request(app).post("/api/v1/auth/register").send(otherParent);
    const otherToken = otherRes.body.data.accessToken;

    const listRes = await request(app).get("/api/v1/children").set("Authorization", `Bearer ${otherToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(0);
  });

  it("enforces the max-children-per-family guardrail", async () => {
    for (let i = 0; i < 8; i += 1) {
      const res = await request(app)
        .post("/api/v1/children")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-parental-gate-token", gateToken)
        .send({ displayName: `Kid${i}`, ageRange: "7-9" });
      expect(res.status).toBe(201);
    }
    const overLimitRes = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "OneTooMany", ageRange: "7-9" });
    expect(overLimitRes.status).toBe(400);
  });

  it("activates (switches to) a child profile and returns a session-context access token", async () => {
    const createRes = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "Mia", ageRange: "7-9" });
    const childId = createRes.body.data._id;

    const activateRes = await request(app)
      .post(`/api/v1/children/${childId}/activate`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(activateRes.status).toBe(200);
    expect(activateRes.body.data.accessToken).toEqual(expect.any(String));
    expect(activateRes.body.data.child.displayName).toBe("Mia");
  });

  it("returns 404 when trying to access another family's child", async () => {
    const createRes = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "Mia", ageRange: "7-9" });
    const childId = createRes.body.data._id;

    const otherRes = await request(app).post("/api/v1/auth/register").send({ ...parent, email: "other2@example.com" });
    const otherToken = otherRes.body.data.accessToken;

    const res = await request(app).get(`/api/v1/children/${childId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("returns a progress summary for a child", async () => {
    const createRes = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "Mia", ageRange: "7-9" });
    const childId = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/children/${childId}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      displayName: "Mia",
      currentLevel: 1,
      totalXP: 0,
      currentStreak: 0,
    });
  });

  it("soft-deletes a child profile (parental-gate-protected)", async () => {
    const createRes = await request(app)
      .post("/api/v1/children")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ displayName: "Mia", ageRange: "7-9" });
    const childId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/children/${childId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app).get("/api/v1/children").set("Authorization", `Bearer ${accessToken}`);
    expect(listRes.body.data).toHaveLength(0);
  });
});
