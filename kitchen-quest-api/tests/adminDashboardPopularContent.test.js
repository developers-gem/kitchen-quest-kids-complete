const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/modules/users/user.model");
const Game = require("../src/modules/games/game.model");
const GameSession = require("../src/modules/games/gameSession.model");
const ChildProfile = require("../src/modules/children/childProfile.model");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerAdmin() {
  const res = await request(app).post("/api/v1/auth/register").send(parent);
  const { accessToken, user } = res.body.data;
  await User.findByIdAndUpdate(user._id, { $set: { role: ["parent", "platform_admin"] } });
  return { accessToken, userId: user._id, organizationId: user.organizationId };
}

const VALID_QUIZ_CONFIG = {
  questions: [{ id: "q1", prompt: "?", options: [{ id: "a", text: "A" }], correctOptionId: "a" }],
};

describe("Admin Dashboard: popular content ranking (real data, exercises the $in fix)", () => {
  it("ranks games by completion count using a single $in lookup, not per-id findById calls", async () => {
    const { accessToken, organizationId } = await registerAdmin();

    const child = await ChildProfile.create({ familyId: organizationId, displayName: "Mia", ageRange: "7-9" });

    const popularGame = await Game.create({
      title: "Popular Game",
      slug: "popular-game",
      gameType: "quiz",
      ageGroups: ["7-9"],
      configuration: VALID_QUIZ_CONFIG,
      status: "published",
    });
    const lessPopularGame = await Game.create({
      title: "Less Popular Game",
      slug: "less-popular-game",
      gameType: "quiz",
      ageGroups: ["7-9"],
      configuration: VALID_QUIZ_CONFIG,
      status: "published",
    });

    await GameSession.create({ childProfile: child._id, game: popularGame._id, status: "completed" });
    await GameSession.create({ childProfile: child._id, game: popularGame._id, status: "completed" });
    await GameSession.create({ childProfile: child._id, game: popularGame._id, status: "completed" });
    await GameSession.create({ childProfile: child._id, game: lessPopularGame._id, status: "completed" });

    const res = await request(app)
      .get("/api/v1/admin/dashboard/overview")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const { topGames } = res.body.data.popularContent;

    const popular = topGames.find((g) => g._id === String(popularGame._id));
    const lessPopular = topGames.find((g) => g._id === String(lessPopularGame._id));

    expect(popular).toBeDefined();
    expect(popular.completions).toBe(3);
    expect(lessPopular).toBeDefined();
    expect(lessPopular.completions).toBe(1);
    expect(topGames.indexOf(popular)).toBeLessThan(topGames.indexOf(lessPopular));
  });

  it("never returns a null/undefined entry for an id with completions but no matching game (defensive against stale references)", async () => {
    const { accessToken, organizationId } = await registerAdmin();
    const child = await ChildProfile.create({ familyId: organizationId, displayName: "Mia", ageRange: "7-9" });

    const game = await Game.create({
      title: "Temp Game",
      slug: "temp-game",
      gameType: "quiz",
      ageGroups: ["7-9"],
      configuration: VALID_QUIZ_CONFIG,
      status: "published",
    });
    await GameSession.create({ childProfile: child._id, game: game._id, status: "completed" });
    await Game.deleteOne({ _id: game._id });

    const res = await request(app)
      .get("/api/v1/admin/dashboard/overview")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.popularContent.topGames.every((g) => g !== null)).toBe(true);
  });
});
