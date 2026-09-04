const request = require("supertest");
const createApp = require("../src/app");
const Region = require("../src/modules/regions/region.model");
const Game = require("../src/modules/games/game.model");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerParent() {
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

async function createChild(accessToken, gateToken) {
  const res = await request(app)
    .post("/api/v1/children")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("x-parental-gate-token", gateToken)
    .send({ displayName: "Mia", ageRange: "7-9" });
  return res.body.data;
}

describe("Regions", () => {
  it("lists regions sorted by unlockOrder, unlock status derived per child", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    await Region.create({ name: "New York", slug: "new-york-1", unlockOrder: 1, unlockRequirements: { type: "always" }, status: "published" });
    await Region.create({
      name: "Iowa",
      slug: "iowa-1",
      unlockOrder: 2,
      unlockRequirements: { type: "levelAtLeast", value: 5 },
      status: "published",
    });

    const res = await request(app)
      .get(`/api/v1/regions?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe("New York");
    expect(res.body.data[0].unlocked).toBe(true);
    expect(res.body.data[1].name).toBe("Iowa");
    expect(res.body.data[1].unlocked).toBe(false);
  });

  it("lists regions without unlock info when no childId is supplied", async () => {
    const accessToken = await registerParent();
    await Region.create({ name: "New York", slug: "new-york-2", unlockOrder: 1, status: "published" });

    const res = await request(app).get("/api/v1/regions").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].unlocked).toBeUndefined();
  });

  it("reports the correct per-region published game count using a single bulk query, not one query per region", async () => {
    // Exercises the fix for the N+1 pattern that used to run one
    // Game.countDocuments per region inside a .map() -- this asserts the
    // *result* is still correct after replacing that with a single
    // Game.find() counted in application code.
    const accessToken = await registerParent();
    const newYork = await Region.create({ name: "New York", slug: "new-york-3", unlockOrder: 1, status: "published" });
    const iowa = await Region.create({ name: "Iowa", slug: "iowa-3", unlockOrder: 2, status: "published" });

    const quizConfig = { questions: [{ id: "q1", prompt: "?", options: [{ id: "a", text: "A" }], correctOptionId: "a" }] };

    // 2 published games in New York, 1 in Iowa, 1 unpublished (draft) in
    // New York that must NOT count, 1 published game with no region at
    // all that must not be attributed to either.
    await Game.create({ title: "NY Game 1", slug: "ny-game-1", gameType: "quiz", ageGroups: ["7-9"], configuration: quizConfig, status: "published", region: newYork._id });
    await Game.create({ title: "NY Game 2", slug: "ny-game-2", gameType: "quiz", ageGroups: ["7-9"], configuration: quizConfig, status: "published", region: newYork._id });
    await Game.create({ title: "NY Draft Game", slug: "ny-draft-game", gameType: "quiz", ageGroups: ["7-9"], configuration: quizConfig, status: "draft", region: newYork._id });
    await Game.create({ title: "Iowa Game 1", slug: "iowa-game-1", gameType: "quiz", ageGroups: ["7-9"], configuration: quizConfig, status: "published", region: iowa._id });
    await Game.create({ title: "Regionless Game", slug: "regionless-game", gameType: "quiz", ageGroups: ["7-9"], configuration: quizConfig, status: "published" });

    const res = await request(app).get("/api/v1/regions").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);

    const nyResult = res.body.data.find((r) => r.slug === "new-york-3");
    const iowaResult = res.body.data.find((r) => r.slug === "iowa-3");
    expect(nyResult.gameCount).toBe(2);
    expect(iowaResult.gameCount).toBe(1);
  });
});
