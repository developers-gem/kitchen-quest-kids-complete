const request = require("supertest");
const createApp = require("../src/app");
const Recipe = require("../src/modules/recipes/recipe.model");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerParent(email = parent.email) {
  const res = await request(app).post("/api/v1/auth/register").send({ ...parent, email });
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

const TWO_STEP_RECIPE = {
  title: "Garden Rainbow Skewers",
  slug: `garden-rainbow-skewers-${Date.now()}-${Math.random()}`,
  description: "No-cook rainbow snack.",
  ageGroups: ["7-9"],
  preparationTimeMinutes: 10,
  cookingTimeMinutes: 0,
  totalTimeMinutes: 10,
  ingredients: [
    { name: "Strawberries", quantity: 6, unit: "count", category: "Produce" },
    { name: "Blueberries", quantity: 0.5, unit: "cup", category: "Produce" },
  ],
  steps: [
    { stepNumber: 1, title: "Wash", instruction: "Wash the fruit.", simpleInstruction: "Wash it!", safetyLevel: "none" },
    { stepNumber: 2, title: "Skewer", instruction: "Thread onto a skewer.", simpleInstruction: "Skewer it!", safetyLevel: "none" },
  ],
  xpReward: 25,
  requiresParentVerification: false,
  status: "published",
};

const SLIDER_RECIPE = {
  title: "Mini Rainbow Sliders",
  slug: `mini-rainbow-sliders-${Date.now()}-${Math.random()}`,
  description: "Bite-sized balanced burgers.",
  ageGroups: ["7-9"],
  preparationTimeMinutes: 15,
  cookingTimeMinutes: 15,
  totalTimeMinutes: 30,
  ingredients: [{ name: "Turkey", quantity: 1, unit: "lb", category: "Meat" }],
  steps: [
    { stepNumber: 1, title: "Form patties", instruction: "Form the patties.", safetyLevel: "none" },
    { stepNumber: 2, title: "Cook", instruction: "Cook thoroughly.", safetyLevel: "highHeat", parentAssistanceRequired: true },
  ],
  xpReward: 45,
  requiresParentVerification: true,
  allergenInformation: ["gluten"],
  status: "published",
};

describe("Recipes: listing, detail, and mode shaping", () => {
  it("lists only published recipes with stepCount derived, not stored", async () => {
    const accessToken = await registerParent();
    await Recipe.create(TWO_STEP_RECIPE);
    await Recipe.create({ ...TWO_STEP_RECIPE, slug: `draft-${Date.now()}`, status: "draft" });

    const res = await request(app).get("/api/v1/recipes").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].stepCount).toBe(2);
  });

  it("filters recipes by allergenFree", async () => {
    const accessToken = await registerParent();
    await Recipe.create(TWO_STEP_RECIPE);
    await Recipe.create(SLIDER_RECIPE);

    const res = await request(app)
      .get("/api/v1/recipes?allergenFree=gluten")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Garden Rainbow Skewers");
  });

  it("child mode strips ingredient quantities/units and never includes steps", async () => {
    const accessToken = await registerParent();
    const recipe = await Recipe.create(TWO_STEP_RECIPE);

    const res = await request(app)
      .get(`/api/v1/recipes/${recipe.slug}?mode=child`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.ingredients[0]).toEqual({ name: "Strawberries", category: "Produce" });
    expect(res.body.data.steps).toBeUndefined();
  });

  it("parent mode includes full ingredient measurements, steps, and allergens", async () => {
    const accessToken = await registerParent();
    const recipe = await Recipe.create(SLIDER_RECIPE);

    const res = await request(app)
      .get(`/api/v1/recipes/${recipe.slug}?mode=parent`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.ingredients[0].quantity).toBe(1);
    expect(res.body.data.ingredients[0].unit).toBe("lb");
    expect(res.body.data.steps).toHaveLength(2);
    expect(res.body.data.allergenInformation).toEqual(["gluten"]);
    expect(res.body.data.requiresParentVerification).toBe(true);
  });
});

describe("Recipes: cooking session lifecycle", () => {
  it("walks through start -> advance -> complete for a no-verification recipe and awards XP immediately", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await Recipe.create(TWO_STEP_RECIPE);

    const startRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(startRes.status).toBe(201);
    expect(startRes.body.data.currentStep.stepNumber).toBe(1);
    expect(startRes.body.data.currentStep.totalSteps).toBe(2);
    const progressId = startRes.body.data.progress._id;

    const advance1 = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(advance1.body.data.currentStep.stepNumber).toBe(2);
    expect(advance1.body.data.readyToComplete).toBe(false);

    const advance2 = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(advance2.body.data.readyToComplete).toBe(true);
    expect(advance2.body.data.currentStep).toBeNull();

    const completeRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.progress.xpEarned).toBe(25);
    expect(completeRes.body.data.progress.pendingParentVerification).toBe(false);

    const progressCheck = await request(app)
      .get(`/api/v1/children/${child._id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(progressCheck.body.data.totalXP).toBe(25);
  });

  it("rejects completing before all steps are done", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await Recipe.create(TWO_STEP_RECIPE);

    const startRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    const progressId = startRes.body.data.progress._id;

    const completeRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(completeRes.status).toBe(400);
  });

  it("re-starting a session after advancing through every step (without completing or pausing) reports readyToComplete instead of crashing", async () => {
    // Regression test for a real bug: navigating away from the "ready to
    // finish" screen without completing or explicitly pausing left
    // progress.status as "inProgress" with currentStepIndex === total
    // steps. Calling /start again (which is exactly what re-opening the
    // recipe does) used to crash trying to read
    // recipe.steps[totalSteps], which is out of bounds.
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await Recipe.create(TWO_STEP_RECIPE);

    const startRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    const progressId = startRes.body.data.progress._id;

    // Advance through both steps (TWO_STEP_RECIPE has 2 steps) without
    // ever calling /complete.
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    // Re-open the recipe -- this is the call that used to crash.
    const restartRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    expect(restartRes.status).toBe(201);
    expect(restartRes.body.data.progress._id).toBe(progressId);
    expect(restartRes.body.data.currentStep).toBeNull();
    expect(restartRes.body.data.readyToComplete).toBe(true);

    // And completion still works normally from here.
    const completeRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(completeRes.status).toBe(200);
  });

  it("holds XP pending parent verification for recipes that require it, then awards on verify", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await Recipe.create(SLIDER_RECIPE);

    const startRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    const progressId = startRes.body.data.progress._id;

    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    const completeRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(completeRes.body.data.progress.xpEarned).toBe(0);
    expect(completeRes.body.data.progress.pendingParentVerification).toBe(true);

    const noGateVerify = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/verify`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(noGateVerify.status).toBe(403);

    const verifyRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/verify`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ childId: child._id });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.progress.xpEarned).toBe(45);

    const secondVerify = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/verify`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-parental-gate-token", gateToken)
      .send({ childId: child._id });
    expect(secondVerify.body.data.progress.xpEarned).toBe(45);
    // FIXED: the idempotent second-verify response used to omit
    // newlyEarnedAchievements entirely, inconsistent with the
    // first-verify response shape -- now always present.
    expect(secondVerify.body.data.newlyEarnedAchievements).toEqual([]);

    const progressCheck = await request(app)
      .get(`/api/v1/children/${child._id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(progressCheck.body.data.totalXP).toBe(45);
  });

  it("supports pause and resume", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await Recipe.create(TWO_STEP_RECIPE);

    const startRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    const progressId = startRes.body.data.progress._id;

    const pauseRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/pause`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(pauseRes.body.data.status).toBe("paused");

    const advanceWhilePaused = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(advanceWhilePaused.status).toBe(409);

    const resumeRes = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/resume`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.progress.status).toBe("inProgress");

    const restartRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(restartRes.body.data.progress._id).toBe(progressId);
  });

  it("rejects completing the same session twice", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await Recipe.create(TWO_STEP_RECIPE);

    const startRes = await request(app)
      .post(`/api/v1/recipes/${recipe._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    const progressId = startRes.body.data.progress._id;
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/advance`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    const first = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/recipes/progress/${progressId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(second.status).toBe(409);
  });
});

describe("Recipes: grocery integration", () => {
  it("adds a recipe's ingredients to the family's active grocery list, merging duplicates across recipes", async () => {
    const accessToken = await registerParent();
    const recipeA = await Recipe.create(TWO_STEP_RECIPE);
    const recipeB = await Recipe.create({
      ...TWO_STEP_RECIPE,
      slug: `second-recipe-${Date.now()}`,
      ingredients: [
        { name: "Strawberries", quantity: 4, unit: "count", category: "Produce" },
        { name: "Honey", quantity: 1, unit: "tbsp", category: "Pantry" },
      ],
    });

    await request(app)
      .post(`/api/v1/recipes/${recipeA._id}/add-to-grocery-list`)
      .set("Authorization", `Bearer ${accessToken}`);
    const secondRes = await request(app)
      .post(`/api/v1/recipes/${recipeB._id}/add-to-grocery-list`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(secondRes.status).toBe(200);
    const items = secondRes.body.data.items;
    const strawberryLine = items.find((i) => i.name === "Strawberries");
    expect(strawberryLine.quantity).toBe(10);
    expect(strawberryLine.sourceRecipes).toHaveLength(2);
    expect(items.find((i) => i.name === "Honey")).toBeDefined();
    expect(items.find((i) => i.name === "Blueberries")).toBeDefined();
  });

  it("supports checking off and adding custom grocery items", async () => {
    const accessToken = await registerParent();
    const recipe = await Recipe.create(TWO_STEP_RECIPE);
    await request(app)
      .post(`/api/v1/recipes/${recipe._id}/add-to-grocery-list`)
      .set("Authorization", `Bearer ${accessToken}`);

    const listRes = await request(app).get("/api/v1/grocery").set("Authorization", `Bearer ${accessToken}`);
    const itemId = listRes.body.data.items[0]._id;

    const checkRes = await request(app)
      .patch(`/api/v1/grocery/items/${itemId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ checked: true });
    expect(checkRes.body.data.items.find((i) => i._id === itemId).checked).toBe(true);

    const customRes = await request(app)
      .post("/api/v1/grocery/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Paper towels", category: "Household" });
    expect(customRes.status).toBe(201);
    expect(customRes.body.data.items.some((i) => i.name === "Paper towels" && i.custom)).toBe(true);
  });
});
