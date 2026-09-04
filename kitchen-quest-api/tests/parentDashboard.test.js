const request = require("supertest");
const createApp = require("../src/app");
const Game = require("../src/modules/games/game.model");
const Recipe = require("../src/modules/recipes/recipe.model");
const AvatarConfiguration = require("../src/modules/avatars/avatar.model");

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

async function createChild(accessToken, gateToken, overrides = {}) {
  const res = await request(app)
    .post("/api/v1/children")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("x-parental-gate-token", gateToken)
    .send({ displayName: "Mia", ageRange: "7-9", ...overrides });
  return res.body.data;
}

const QUIZ_GAME = {
  title: "Big Apple Crunch",
  slug: `big-apple-crunch-${Date.now()}-${Math.random()}`,
  gameType: "quiz",
  ageGroups: ["7-9"],
  xpReward: 30,
  maxStars: 3,
  state: "New York",
  nutritionTopics: ["fiber"],
  foodTopics: ["apples"],
  status: "published",
  configuration: {
    questions: [{ id: "q1", prompt: "Fiber?", options: [{ id: "a", text: "Apple" }, { id: "b", text: "Candy" }], correctOptionId: "a" }],
  },
  unlockRequirements: { type: "always" },
};

const SKEWER_RECIPE = {
  title: "Garden Rainbow Skewers",
  slug: `garden-rainbow-skewers-${Date.now()}-${Math.random()}`,
  description: "No-cook rainbow snack.",
  ageGroups: ["7-9"],
  preparationTimeMinutes: 10,
  cookingTimeMinutes: 0,
  totalTimeMinutes: 10,
  ingredients: [{ name: "Strawberries", quantity: 6, unit: "count", category: "Produce" }],
  steps: [{ stepNumber: 1, title: "Skewer", instruction: "Thread onto a skewer.", safetyLevel: "none" }],
  cookingSkills: ["food prep without heat"],
  nutritionLearning: ["vitamin variety"],
  xpReward: 25,
  requiresParentVerification: false,
  status: "published",
};

describe("Avatars", () => {
  it("returns the character catalog and fixed color options", async () => {
    const accessToken = await registerParent();
    await AvatarConfiguration.create({ characterId: "fox", label: "Fox", emoji: "🦊" });
    await AvatarConfiguration.create({ characterId: "panda", label: "Panda", emoji: "🐼" });

    const res = await request(app).get("/api/v1/avatars").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.characters).toHaveLength(2);
    expect(res.body.data.colors.map((c) => c.id)).toEqual(["primary", "secondary", "accent", "neutral"]);
  });

  it("lets a child profile be created with a chosen character and color", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const avatar = await AvatarConfiguration.create({ characterId: "fox", label: "Fox", emoji: "🦊" });

    const child = await createChild(accessToken, gateToken, { avatarConfigId: avatar._id, avatarColor: "secondary" });
    expect(child.avatarColor).toBe("secondary");
    expect(child.avatarConfigId).toBe(avatar._id);
  });
});

describe("Parent Dashboard: access control", () => {
  it("requires the parental gate for every dashboard endpoint", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const noGate = await request(app)
      .get(`/api/v1/parent-dashboard/overview?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(noGate.status).toBe(403);

    const withGate = await request(app)
      .get(`/api/v1/parent-dashboard/overview?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);
    expect(withGate.status).toBe(200);
  });

  it("rejects a childId from another family", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const otherRes = await request(app).post("/api/v1/auth/register").send({ ...parent, email: "other@example.com" });
    const otherToken = otherRes.body.data.accessToken;
    const otherGate = await getGateToken(otherToken);

    const res = await request(app)
      .get(`/api/v1/parent-dashboard/overview?childId=${child._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .set("x-parental-gate-token", otherGate);
    expect(res.status).toBe(404);
  });
});

describe("Parent Dashboard: sections reflect real activity", () => {
  async function setupChildWithActivity() {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await Game.create(QUIZ_GAME);
    const recipe = await Recipe.create(SKEWER_RECIPE);

    // Play and complete the game.
    const startGameRes = await request(app)
      .post(`/api/v1/games/${game._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    await request(app)
      .post(`/api/v1/games/${game._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ sessionId: startGameRes.body.data.session._id, childId: child._id, outcome: { answers: [{ questionId: "q1", selectedOptionId: "a" }] } });

    // Cook and complete the recipe.
    const startRecipeRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    const progressId = startRecipeRes.body.data.progress._id;
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    // Add the recipe's ingredients to the grocery list.
    await request(app)
      .post(`/api/v1/recipes/${recipe._id}/add-to-grocery-list`)
      .set("Authorization", `Bearer ${accessToken}`);

    return { accessToken, gateToken, child };
  }

  it("overview reflects total XP, streak, and recent activity from both games and recipes", async () => {
    const { accessToken, gateToken, child } = await setupChildWithActivity();

    const res = await request(app)
      .get(`/api/v1/parent-dashboard/overview?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    // Game: 30 XP completion + 10 XP perfect-score bonus (this fixture's
    // quiz has one question, answered correctly -- a perfect run) = 40.
    // Recipe: 25 XP completion (recipes don't have a perfect-score bonus
    // concept -- there's no "ratio" to score a recipe against).
    expect(res.body.data.totalXP).toBe(40 + 25);
    expect(res.body.data.currentStreak).toBe(1);
    expect(res.body.data.weeklyXpEarned).toBe(65);
    expect(res.body.data.totalActivityCount).toBe(2);
    expect(res.body.data.recentActivity).toHaveLength(2);
    expect(res.body.data.recentActivity.map((a) => a.type).sort()).toEqual(["game", "recipe"]);
  });

  it("weekly summary reflects games/recipes completed and foods tried this week", async () => {
    const { accessToken, gateToken, child } = await setupChildWithActivity();

    const res = await request(app)
      .get(`/api/v1/parent-dashboard/weekly-summary?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    expect(res.body.data.gamesCompleted).toBe(1);
    expect(res.body.data.recipesCompleted).toBe(1);
    expect(res.body.data.foodsTried).toBe(1); // Strawberries
    expect(res.body.data.totalXPEarned).toBe(65); // 30 + 10 perfect-score bonus + 25
  });

  it("weekly summary counts a completed nutrition lesson (fixed -- used to be hardcoded to 0)", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const NutritionLesson = require("../src/modules/nutrition/nutritionLesson.model");
    const lesson = await NutritionLesson.create({
      title: "Fiber 101",
      slug: "fiber-101-dashboard-test",
      ageGroups: ["7-9"],
      topic: "fiber",
      content: "Fiber helps your body...",
      xpReward: 15,
      status: "published",
    });

    const completeRes = await request(app)
      .post(`/api/v1/nutrition-lessons/${lesson._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(completeRes.status).toBe(200);

    const res = await request(app)
      .get(`/api/v1/parent-dashboard/weekly-summary?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    expect(res.body.data.nutritionLessonsCompleted).toBe(1);
  });

  it("learning progress reflects nutrition topics, cooking skills, foods discovered, and regions", async () => {
    const { accessToken, gateToken, child } = await setupChildWithActivity();

    const res = await request(app)
      .get(`/api/v1/parent-dashboard/learning-progress?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    expect(res.body.data.nutritionTopicsExplored).toEqual(expect.arrayContaining(["fiber", "vitamin variety"]));
    expect(res.body.data.cookingSkillsLearned).toEqual(["food prep without heat"]);
    expect(res.body.data.foodsDiscovered).toEqual(expect.arrayContaining(["apples", "Strawberries"]));
    expect(res.body.data.regionsUnlocked).toEqual(["New York"]);
  });

  it("activity history is paginated and includes forward-compatible empty challenges/achievements", async () => {
    const { accessToken, gateToken, child } = await setupChildWithActivity();

    const res = await request(app)
      .get(`/api/v1/parent-dashboard/activity-history?childId=${child._id}&page=1&limit=10`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    expect(res.body.data.games).toHaveLength(1);
    expect(res.body.data.recipes).toHaveLength(1);
    expect(res.body.data.challenges).toEqual([]);
    expect(res.body.data.achievements).toEqual([]);
    expect(res.body.meta.total).toBe(2);
  });

  it("grocery section shows needed/checked/custom items and recipe source grouping", async () => {
    const { accessToken, gateToken } = await setupChildWithActivity();

    const res = await request(app)
      .get("/api/v1/parent-dashboard/grocery")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    expect(res.body.data.needed).toHaveLength(1);
    expect(res.body.data.needed[0].name).toBe("Strawberries");
    expect(res.body.data.checked).toHaveLength(0);
    expect(res.body.data.byRecipe).toHaveLength(1);
    expect(res.body.data.byRecipe[0].ingredientNames).toContain("Strawberries");
  });

  it("settings section surfaces notification preferences and per-child accessibility settings", async () => {
    const { accessToken, gateToken, child } = await setupChildWithActivity();

    const res = await request(app)
      .get("/api/v1/parent-dashboard/settings")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken);

    expect(res.status).toBe(200);
    expect(res.body.data.notificationPreferences).toEqual([]);
    expect(res.body.data.children.some((c) => c._id === child._id)).toBe(true);
    expect(res.body.data.privacy.dataExportOrDeleteEndpoint).toBe("DELETE /api/v1/users/me");
  });
});
