const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/modules/users/user.model");
const Game = require("../src/modules/games/game.model");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerAdmin(email = "admin@example.com") {
  const res = await request(app).post("/api/v1/auth/register").send({ ...parent, email });
  const { accessToken, user } = res.body.data;
  await User.findByIdAndUpdate(user._id, { $set: { role: ["parent", "platform_admin"] } });
  return accessToken;
}

const VALID_QUIZ_CONFIG = {
  questions: [{ id: "q1", prompt: "?", options: [{ id: "a", text: "A" }], correctOptionId: "a" }],
};

const baseChallenge = {
  title: "Play a specific game today",
  xpReward: 25,
  dateRange: { startDate: "2026-01-01", endDate: "2026-01-07" },
};

/**
 * Regression tests for a real gap found in a second investigation pass:
 * the admin API used to accept a "completeSpecificGame"/
 * "completeSpecificRecipe" challenge with no gameId/recipeId at all --
 * not rejected, just silently accepted -- which meant the challenge
 * would publish successfully and then never award progress to any
 * child, forever, with no error anywhere to reveal why.
 */
describe("Admin: Daily Challenge target/challengeType cross-field validation", () => {
  it("rejects a completeSpecificGame challenge with no gameId", async () => {
    const accessToken = await registerAdmin();

    const res = await request(app)
      .post("/api/v1/admin/daily-challenges")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...baseChallenge, challengeType: "completeSpecificGame", target: { count: 1 } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a completeSpecificRecipe challenge with no recipeId", async () => {
    const accessToken = await registerAdmin();

    const res = await request(app)
      .post("/api/v1/admin/daily-challenges")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...baseChallenge, challengeType: "completeSpecificRecipe", target: { count: 1 } });

    expect(res.status).toBe(400);
  });

  it("accepts a completeSpecificGame challenge that does include a gameId", async () => {
    const accessToken = await registerAdmin();
    const game = await Game.create({
      title: "Target Game",
      slug: `target-game-${Date.now()}`,
      gameType: "quiz",
      ageGroups: ["7-9"],
      configuration: VALID_QUIZ_CONFIG,
      status: "published",
    });

    const res = await request(app)
      .post("/api/v1/admin/daily-challenges")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...baseChallenge, challengeType: "completeSpecificGame", target: { count: 1, gameId: String(game._id) } });

    expect(res.status).toBe(201);
    expect(res.body.data.target.gameId).toBe(String(game._id));
  });

  it("accepts completeAnyGame / completeAnyRecipe without requiring either id", async () => {
    const accessToken = await registerAdmin();

    const res = await request(app)
      .post("/api/v1/admin/daily-challenges")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...baseChallenge, challengeType: "completeAnyGame", target: { count: 2 } });

    expect(res.status).toBe(201);
  });

  it("a partial update that doesn't touch challengeType/target is not held to the cross-field rule", async () => {
    const accessToken = await registerAdmin();
    const created = await request(app)
      .post("/api/v1/admin/daily-challenges")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...baseChallenge, challengeType: "completeAnyGame", target: { count: 2 } });

    const updateRes = await request(app)
      .patch(`/api/v1/admin/daily-challenges/${created.body.data._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ xpReward: 50 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.xpReward).toBe(50);
  });
});
