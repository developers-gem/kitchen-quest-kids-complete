const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/modules/users/user.model");

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

async function makeAdmin(userId) {
  await User.findByIdAndUpdate(userId, { $set: { role: ["parent", "platform_admin"] } });
}

async function registerAdmin(email = "admin@example.com") {
  const { accessToken, userId } = await registerAndGetToken(email);
  await makeAdmin(userId);
  return accessToken;
}

const VALID_QUIZ_CONFIG = {
  questions: [
    {
      id: "q1",
      prompt: "Which is healthier?",
      options: [
        { id: "a", text: "Apple" },
        { id: "b", text: "Candy" },
      ],
      correctOptionId: "a",
    },
  ],
};

describe("Admin: access control", () => {
  it("rejects non-admin users from every admin route", async () => {
    const { accessToken } = await registerAndGetToken();
    const res = await request(app).get("/api/v1/admin/dashboard/overview").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/admin/games");
    expect(res.status).toBe(401);
  });

  it("allows a platform_admin through", async () => {
    const adminToken = await registerAdmin();
    const res = await request(app).get("/api/v1/admin/games").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Admin: Games -- generic CRUD + workflow via the shared factory", () => {
  it("creates a game as a draft regardless of a submitted status, ignoring client-supplied status", async () => {
    const adminToken = await registerAdmin();
    const res = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Test Quiz Game",
        slug: "test-quiz-game",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: VALID_QUIZ_CONFIG,
        status: "published",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.createdBy).toBeDefined();
    expect(res.body.data.version).toBe(1);
  });

  it("rejects a configuration that doesn't match its declared gameType", async () => {
    const adminToken = await registerAdmin();
    const res = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Broken Game",
        slug: "broken-game",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: { notAQuizShape: true },
      });
    expect(res.status).toBe(400);
  });

  it("enforces the workflow: draft cannot jump straight to published", async () => {
    const adminToken = await registerAdmin();
    const createRes = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Workflow Game",
        slug: "workflow-game",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: VALID_QUIZ_CONFIG,
      });
    const gameId = createRes.body.data._id;

    const badTransition = await request(app)
      .post(`/api/v1/admin/games/${gameId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "published" });
    expect(badTransition.status).toBe(400);

    const toReview = await request(app)
      .post(`/api/v1/admin/games/${gameId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "review" });
    expect(toReview.status).toBe(200);
    expect(toReview.body.data.status).toBe("review");

    const toPublished = await request(app)
      .post(`/api/v1/admin/games/${gameId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "published" });
    expect(toPublished.status).toBe(200);
    expect(toPublished.body.data.status).toBe("published");
    expect(toPublished.body.data.publishedBy).toBeDefined();
    expect(toPublished.body.data.publishedAt).toBeDefined();

    const childFacingRes = await request(app)
      .get("/api/v1/games")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(childFacingRes.body.data.some((g) => g.slug === "workflow-game")).toBe(true);
  });

  it("bumps version on content edits but not on pure status transitions", async () => {
    const adminToken = await registerAdmin();
    const createRes = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Version Game",
        slug: "version-game",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: VALID_QUIZ_CONFIG,
      });
    const gameId = createRes.body.data._id;
    expect(createRes.body.data.version).toBe(1);

    const updateRes = await request(app)
      .patch(`/api/v1/admin/games/${gameId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "An updated description" });
    expect(updateRes.body.data.version).toBe(2);

    const transitionRes = await request(app)
      .post(`/api/v1/admin/games/${gameId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "review" });
    expect(transitionRes.body.data.version).toBe(2);
  });

  it("refuses to delete non-draft content, requiring archive instead", async () => {
    const adminToken = await registerAdmin();
    const createRes = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Undeleteable Game",
        slug: "undeleteable-game",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: VALID_QUIZ_CONFIG,
      });
    const gameId = createRes.body.data._id;

    await request(app)
      .post(`/api/v1/admin/games/${gameId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "review" });

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/games/${gameId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(400);

    const draftDeleteRes = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Deleteable Draft",
        slug: "deleteable-draft",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: VALID_QUIZ_CONFIG,
      });
    const draftId = draftDeleteRes.body.data._id;
    const okDelete = await request(app)
      .delete(`/api/v1/admin/games/${draftId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(okDelete.status).toBe(200);
  });

  it("filters and searches the admin games list", async () => {
    const adminToken = await registerAdmin();
    await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Apple Adventure", slug: "apple-adventure", gameType: "quiz", ageGroups: ["7-9"], configuration: VALID_QUIZ_CONFIG });
    await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Banana Bonanza", slug: "banana-bonanza", gameType: "quiz", ageGroups: ["7-9"], configuration: VALID_QUIZ_CONFIG });

    const searchRes = await request(app)
      .get("/api/v1/admin/games?search=apple")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].title).toBe("Apple Adventure");

    const statusRes = await request(app)
      .get("/api/v1/admin/games?status=draft")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(statusRes.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Admin: Recipes", () => {
  it("creates and publishes a recipe through the workflow", async () => {
    const adminToken = await registerAdmin();
    const createRes = await request(app)
      .post("/api/v1/admin/recipes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Test Recipe",
        slug: "test-recipe",
        description: "A recipe for testing",
        ageGroups: ["7-9"],
        preparationTimeMinutes: 10,
        cookingTimeMinutes: 5,
        totalTimeMinutes: 15,
        ingredients: [{ name: "Flour", quantity: 1, unit: "cup", category: "Baking" }],
        steps: [{ stepNumber: 1, title: "Mix", instruction: "Mix it all together." }],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("draft");

    const recipeId = createRes.body.data._id;
    await request(app)
      .post(`/api/v1/admin/recipes/${recipeId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "review" });
    const publishRes = await request(app)
      .post(`/api/v1/admin/recipes/${recipeId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "published" });
    expect(publishRes.body.data.status).toBe("published");
  });
});

describe("Admin: Regions", () => {
  it("creates a region and reports assigned games via the content endpoint", async () => {
    const adminToken = await registerAdmin();
    const regionRes = await request(app)
      .post("/api/v1/admin/regions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Test Region", slug: "test-region", unlockOrder: 1 });
    expect(regionRes.status).toBe(201);
    const regionId = regionRes.body.data._id;

    const gameRes = await request(app)
      .post("/api/v1/admin/games")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Regional Game",
        slug: "regional-game",
        gameType: "quiz",
        ageGroups: ["7-9"],
        configuration: VALID_QUIZ_CONFIG,
        region: regionId,
      });
    expect(gameRes.status).toBe(201);

    const contentRes = await request(app)
      .get(`/api/v1/admin/regions/${regionId}/content`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(contentRes.status).toBe(200);
    expect(contentRes.body.data.games).toHaveLength(1);
    expect(contentRes.body.data.games[0].title).toBe("Regional Game");
    expect(contentRes.body.data.recipes).toHaveLength(0);
  });
});

describe("Admin: Nutrition content", () => {
  it("creates a nutrition lesson and rejects an invalid embedded quiz", async () => {
    const adminToken = await registerAdmin();

    const badRes = await request(app)
      .post("/api/v1/admin/nutrition/lessons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Fiber 101",
        slug: "fiber-101",
        ageGroups: ["7-9"],
        topic: "fiber",
        content: "Fiber helps your body...",
        quiz: { notAQuizShape: true },
      });
    expect(badRes.status).toBe(400);

    const goodRes = await request(app)
      .post("/api/v1/admin/nutrition/lessons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Fiber 101",
        slug: "fiber-101",
        ageGroups: ["7-9"],
        topic: "fiber",
        content: "Fiber helps your body...",
        quiz: VALID_QUIZ_CONFIG,
      });
    expect(goodRes.status).toBe(201);
  });

  it("creates a food fact", async () => {
    const adminToken = await registerAdmin();
    const res = await request(app)
      .post("/api/v1/admin/nutrition/food-facts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ foodName: "Blueberries", fact: "Packed with antioxidants!", ageGroups: ["4-6"] });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("draft");
  });
});

describe("Admin: Achievements", () => {
  it("creates an achievement with XP reward and criteria", async () => {
    const adminToken = await registerAdmin();
    const res = await request(app)
      .post("/api/v1/admin/achievements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Rainbow Chef",
        description: "Cook 5 colorful recipes",
        category: "cooking",
        unlockCriteria: { type: "recipesCompleted", value: 5 },
        xpReward: 100,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.xpReward).toBe(100);
  });
});

describe("Admin: Dashboard", () => {
  it("reports platform-wide totals and popular content", async () => {
    const adminToken = await registerAdmin();
    await registerAndGetToken("otherparent@example.com");

    const res = await request(app).get("/api/v1/admin/dashboard/overview").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.data.totalFamilies).toBeGreaterThanOrEqual(2);
    expect(res.body.data.activeUsers).toHaveProperty("childProfilesActiveLast7Days");
    expect(res.body.data.popularContent).toHaveProperty("topGames");
    expect(res.body.data.popularContent).toHaveProperty("topRecipes");
  });
});
