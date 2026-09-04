const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/modules/users/user.model");
const Game = require("../src/modules/games/game.model");
const Recipe = require("../src/modules/recipes/recipe.model");
const NutritionLesson = require("../src/modules/nutrition/nutritionLesson.model");
const Achievement = require("../src/modules/achievements/achievement.model");
const DailyChallenge = require("../src/modules/dailyChallenges/dailyChallenge.model");
const XPTransaction = require("../src/modules/xp/xpTransaction.model");
const { calculateLevel, updateStreak, dayKeyInTimezone } = require("../src/utils/xpEngine");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerParent(email = parent.email, timezone) {
  const res = await request(app).post("/api/v1/auth/register").send({ ...parent, email, timezone });
  return { accessToken: res.body.data.accessToken, userId: res.body.data.user._id };
}

async function makeAdmin(userId) {
  await User.findByIdAndUpdate(userId, { $set: { role: ["parent", "platform_admin"] } });
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

const QUIZ_CONFIG = {
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

async function makeGame(overrides = {}) {
  return Game.create({
    title: "Test Game",
    slug: `test-game-${Date.now()}-${Math.random()}`,
    gameType: "quiz",
    ageGroups: ["7-9"],
    xpReward: 30,
    maxStars: 3,
    status: "published",
    configuration: QUIZ_CONFIG,
    unlockRequirements: { type: "always" },
    ...overrides,
  });
}

async function makeRecipe(overrides = {}) {
  return Recipe.create({
    title: "Test Recipe",
    slug: `test-recipe-${Date.now()}-${Math.random()}`,
    description: "A recipe for testing",
    ageGroups: ["7-9"],
    preparationTimeMinutes: 5,
    cookingTimeMinutes: 5,
    totalTimeMinutes: 10,
    ingredients: [{ name: "Flour", category: "Baking" }],
    steps: [{ stepNumber: 1, title: "Mix", instruction: "Mix it." }],
    xpReward: 40,
    requiresParentVerification: false,
    status: "published",
    ...overrides,
  });
}

async function playAndCompleteGame(accessToken, game, childId) {
  const startRes = await request(app)
    .post(`/api/v1/games/${game._id}/start`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ childId });
  const sessionId = startRes.body.data.session._id;
  return request(app)
    .post(`/api/v1/games/${game._id}/complete`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      sessionId,
      childId,
      outcome: { answers: [{ questionId: "q1", selectedOptionId: "a" }] },
    });
}

async function cookAndCompleteRecipe(accessToken, recipe, childId) {
  const startRes = await request(app)
    .post(`/api/v1/recipes/${recipe._id}/start`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ childId });
  const progressId = startRes.body.data.progress._id;
  await request(app)
    .post(`/api/v1/recipes/progress/${progressId}/advance`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ childId });
  return request(app)
    .post(`/api/v1/recipes/progress/${progressId}/complete`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ childId });
}

describe("Gamification: level calculation (centralized formula)", () => {
  it("computes level 1 for 0 XP and scales linearly with the shared curve", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(250)).toBe(3);
    expect(calculateLevel(999)).toBe(10);
  });

  it("never returns a level below 1 even for negative input", () => {
    expect(calculateLevel(-50)).toBe(1);
  });
});

describe("Gamification: streak calculation (timezone-aware)", () => {
  it("starts a new streak at 1 when there's no prior activity", () => {
    const result = updateStreak({ currentStreak: 0, lastActivityDate: null, timezone: "UTC" });
    expect(result).toEqual({ currentStreak: 1, streakIncreased: true, streakBroken: false });
  });

  it("does not increase the streak for a second activity on the same calendar day", () => {
    const now = new Date("2026-06-15T10:00:00Z");
    const lastActivity = new Date("2026-06-15T02:00:00Z");
    const result = updateStreak({ currentStreak: 3, lastActivityDate: lastActivity, timezone: "UTC" }, now);
    expect(result).toEqual({ currentStreak: 3, streakIncreased: false, streakBroken: false });
  });

  it("increments the streak for activity on the very next calendar day", () => {
    const now = new Date("2026-06-16T10:00:00Z");
    const lastActivity = new Date("2026-06-15T10:00:00Z");
    const result = updateStreak({ currentStreak: 3, lastActivityDate: lastActivity, timezone: "UTC" }, now);
    expect(result).toEqual({ currentStreak: 4, streakIncreased: true, streakBroken: false });
  });

  it("resets to 1 (not 0) after a missed day, flagging streakBroken", () => {
    const now = new Date("2026-06-18T10:00:00Z");
    const lastActivity = new Date("2026-06-15T10:00:00Z");
    const result = updateStreak({ currentStreak: 5, lastActivityDate: lastActivity, timezone: "UTC" }, now);
    expect(result).toEqual({ currentStreak: 1, streakIncreased: true, streakBroken: true });
  });

  it("respects the family's timezone at a UTC day boundary a naive UTC-only check would get wrong", () => {
    const lastActivityLA = new Date("2026-06-15T20:00:00Z");
    const nowLA = new Date("2026-06-16T06:30:00Z");

    const laResult = updateStreak(
      { currentStreak: 2, lastActivityDate: lastActivityLA, timezone: "America/Los_Angeles" },
      nowLA
    );
    expect(laResult.streakIncreased).toBe(false);

    const utcResult = updateStreak({ currentStreak: 2, lastActivityDate: lastActivityLA, timezone: "UTC" }, nowLA);
    expect(utcResult.streakIncreased).toBe(true);
  });

  it("falls back to UTC gracefully for an invalid timezone string instead of throwing", () => {
    expect(() => dayKeyInTimezone(new Date(), "Not/A/Real/Zone")).not.toThrow();
  });
});

describe("Gamification: XPTransaction is the only path to totalXP", () => {
  it("every XP-earning game completion creates exactly one matching XPTransaction", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await makeGame();

    const res = await playAndCompleteGame(accessToken, game, child._id);
    const xpEarned = res.body.data.session.xpEarned;
    expect(xpEarned).toBeGreaterThan(0);

    const transactions = await XPTransaction.find({ childProfile: child._id, sourceType: "game", sourceId: game._id });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(xpEarned);

    const progressRes = await request(app)
      .get(`/api/v1/children/${child._id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    // A perfect answer also triggers the separate perfect-score bonus
    // (see the next test) -- total XP is the base award plus that bonus,
    // not just the session's own xpEarned figure.
    const bonusTransactions = await XPTransaction.find({ childProfile: child._id, sourceType: "bonus" });
    const bonusTotal = bonusTransactions.reduce((sum, t) => sum + t.amount, 0);
    expect(progressRes.body.data.totalXP).toBe(xpEarned + bonusTotal);
  });

  it("awards a separate perfect-score bonus transaction on top of the base completion award", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await makeGame();

    await playAndCompleteGame(accessToken, game, child._id);

    const bonusTransactions = await XPTransaction.find({ childProfile: child._id, sourceType: "bonus" });
    expect(bonusTransactions).toHaveLength(1);
    expect(bonusTransactions[0].reason).toMatch(/perfect score/i);
  });
});

describe("Gamification: achievement engine", () => {
  it("awards the 'first game' achievement exactly once, on the first completion", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await makeGame();

    await Achievement.create({
      title: "First Steps",
      description: "Play your first game",
      category: "exploration",
      unlockCriteria: { type: "firstGame" },
      xpReward: 20,
      status: "published",
    });

    const firstRes = await playAndCompleteGame(accessToken, game, child._id);
    expect(firstRes.body.data.newlyEarnedAchievements).toHaveLength(1);
    expect(firstRes.body.data.newlyEarnedAchievements[0].title).toBe("First Steps");

    const secondRes = await playAndCompleteGame(accessToken, game, child._id);
    expect(secondRes.body.data.newlyEarnedAchievements).toHaveLength(0);

    const earnedRes = await request(app)
      .get(`/api/v1/achievements/earned?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(earnedRes.body.data).toHaveLength(1);
  });

  it("awards the 'first recipe' achievement on first recipe completion", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const recipe = await makeRecipe();

    await Achievement.create({
      title: "Junior Chef",
      description: "Cook your first recipe",
      category: "cooking",
      unlockCriteria: { type: "firstRecipe" },
      xpReward: 20,
      status: "published",
    });

    const res = await cookAndCompleteRecipe(accessToken, recipe, child._id);
    expect(res.status).toBe(200);

    const catalogRes = await request(app)
      .get(`/api/v1/achievements/catalog?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    const juniorChef = catalogRes.body.data.find((a) => a.title === "Junior Chef");
    expect(juniorChef.earned).toBe(true);
  });

  it("awards a streak-based achievement only once the streak threshold is genuinely reached", async () => {
    const { accessToken, userId } = await registerParent("streakparent@example.com", "UTC");
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await makeGame();
    await makeAdmin(userId);

    await Achievement.create({
      title: "Warm Streak",
      description: "Reach a 3-day streak",
      category: "streak",
      unlockCriteria: { type: "streakAtLeast", value: 3 },
      xpReward: 15,
      status: "published",
    });

    const ChildProfile = require("../src/modules/children/childProfile.model");

    await playAndCompleteGame(accessToken, game, child._id);
    let current = await ChildProfile.findById(child._id);
    expect(current.currentStreak).toBe(1);

    await ChildProfile.findByIdAndUpdate(child._id, {
      $set: { lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    await playAndCompleteGame(accessToken, game, child._id);
    current = await ChildProfile.findById(child._id);
    expect(current.currentStreak).toBe(2);

    await ChildProfile.findByIdAndUpdate(child._id, {
      $set: { lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const thirdDayRes = await playAndCompleteGame(accessToken, game, child._id);
    current = await ChildProfile.findById(child._id);
    expect(current.currentStreak).toBe(3);

    expect(thirdDayRes.body.data.newlyEarnedAchievements.some((a) => a.title === "Warm Streak")).toBe(true);
  });

  it("supports the 'five foods explored' style criteria", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    await Achievement.create({
      title: "Adventurous Eater",
      description: "Try 2 new foods",
      category: "nutrition",
      unlockCriteria: { type: "foodsExploredAtLeast", value: 2 },
      xpReward: 10,
      status: "published",
    });

    const recipeA = await makeRecipe({ slug: `recipe-a-${Date.now()}` });
    const recipeB = await makeRecipe({ slug: `recipe-b-${Date.now()}` });

    await cookAndCompleteRecipe(accessToken, recipeA, child._id);
    const secondRes = await cookAndCompleteRecipe(accessToken, recipeB, child._id);
    expect(secondRes.status).toBe(200);

    const catalogRes = await request(app)
      .get(`/api/v1/achievements/catalog?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    const adventurousEater = catalogRes.body.data.find((a) => a.title === "Adventurous Eater");
    expect(adventurousEater.earned).toBe(true);
  });
});

describe("Gamification: nutrition lesson completion", () => {
  it("awards XP for completing a lesson with no quiz, and increments nutritionQuestsCompleted once", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const lesson = await NutritionLesson.create({
      title: "Why Fiber Matters",
      slug: `fiber-${Date.now()}`,
      ageGroups: ["7-9"],
      topic: "fiber",
      content: "Fiber helps your body...",
      xpReward: 15,
      status: "published",
    });

    const res = await request(app)
      .post(`/api/v1/nutrition-lessons/${lesson._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    expect(res.status).toBe(200);
    expect(res.body.data.passed).toBe(true);
    expect(res.body.data.xpEarned).toBe(15);

    const progressRes = await request(app)
      .get(`/api/v1/children/${child._id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(progressRes.body.data.progressStats.nutritionQuestsCompleted).toBe(1);
    expect(progressRes.body.data.totalXP).toBe(15);
  });

  it("scores an embedded quiz server-side and never leaks the answer key to the client", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const lesson = await NutritionLesson.create({
      title: "Fiber Quiz",
      slug: `fiber-quiz-${Date.now()}`,
      ageGroups: ["7-9"],
      topic: "fiber",
      content: "...",
      quiz: QUIZ_CONFIG,
      xpReward: 20,
      status: "published",
    });

    const detailRes = await request(app)
      .get(`/api/v1/nutrition-lessons/${lesson.slug}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(detailRes.body.data.quiz.questions[0].correctOptionId).toBeUndefined();

    const wrongRes = await request(app)
      .post(`/api/v1/nutrition-lessons/${lesson._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id, answers: [{ questionId: "q1", selectedOptionId: "b" }] });
    expect(wrongRes.body.data.passed).toBe(false);
    expect(wrongRes.body.data.xpEarned).toBe(0);

    const rightRes = await request(app)
      .post(`/api/v1/nutrition-lessons/${lesson._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id, answers: [{ questionId: "q1", selectedOptionId: "a" }] });
    expect(rightRes.body.data.passed).toBe(true);
    expect(rightRes.body.data.xpEarned).toBe(20);
  });

  it("awards reduced XP on repeat completion of the same lesson", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const lesson = await NutritionLesson.create({
      title: "Repeatable Lesson",
      slug: `repeat-${Date.now()}`,
      ageGroups: ["7-9"],
      topic: "general",
      content: "...",
      xpReward: 20,
      status: "published",
    });

    const first = await request(app)
      .post(`/api/v1/nutrition-lessons/${lesson._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(first.body.data.xpEarned).toBe(20);
    expect(first.body.data.isFirstCompletion).toBe(true);

    const second = await request(app)
      .post(`/api/v1/nutrition-lessons/${lesson._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });
    expect(second.body.data.xpEarned).toBeLessThan(20);
    expect(second.body.data.xpEarned).toBeGreaterThan(0);
    expect(second.body.data.isFirstCompletion).toBe(false);

    const progressRes = await request(app)
      .get(`/api/v1/children/${child._id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(progressRes.body.data.progressStats.nutritionQuestsCompleted).toBe(1);
  });
});

describe("Gamification: daily challenges", () => {
  it("returns an honest empty state when no challenge is scheduled for today", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const res = await request(app)
      .get(`/api/v1/daily-challenge?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.challenge).toBeNull();
  });

  it("tracks progress toward an active challenge and awards XP exactly once on completion", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await makeGame();

    const now = Date.now();
    await DailyChallenge.create({
      title: "Play 2 games today",
      challengeType: "completeAnyGame",
      target: { count: 2 },
      xpReward: 25,
      dateRange: { startDate: new Date(now - 60000), endDate: new Date(now + 60000) },
      applicableAgeGroups: ["7-9"],
      status: "published",
    });

    const statusBefore = await request(app)
      .get(`/api/v1/daily-challenge?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(statusBefore.body.data.challenge.title).toBe("Play 2 games today");
    expect(statusBefore.body.data.progress.current).toBe(0);

    const firstCompletion = await playAndCompleteGame(accessToken, game, child._id);
    expect(firstCompletion.body.data.dailyChallenge.matched).toBe(true);
    expect(firstCompletion.body.data.dailyChallenge.justCompleted).toBe(false);

    const secondCompletion = await playAndCompleteGame(accessToken, game, child._id);
    expect(secondCompletion.body.data.dailyChallenge.justCompleted).toBe(true);
    expect(secondCompletion.body.data.dailyChallenge.xpAwarded).toBe(25);

    const thirdCompletion = await playAndCompleteGame(accessToken, game, child._id);
    expect(thirdCompletion.body.data.dailyChallenge.justCompleted).toBe(false);
    expect(thirdCompletion.body.data.dailyChallenge.xpAwarded).toBe(0);

    const challengeTransactions = await XPTransaction.find({ childProfile: child._id, sourceType: "dailyChallenge" });
    expect(challengeTransactions).toHaveLength(1);
    expect(challengeTransactions[0].amount).toBe(25);
  });

  it("does not match a challenge scoped to a specific game when a different game is completed", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const targetGame = await makeGame({ slug: `target-${Date.now()}` });
    const otherGame = await makeGame({ slug: `other-${Date.now()}` });

    const now = Date.now();
    await DailyChallenge.create({
      title: "Play the target game",
      challengeType: "completeSpecificGame",
      target: { gameId: targetGame._id, count: 1 },
      xpReward: 25,
      dateRange: { startDate: new Date(now - 60000), endDate: new Date(now + 60000) },
      applicableAgeGroups: ["7-9"],
      status: "published",
    });

    const otherResult = await playAndCompleteGame(accessToken, otherGame, child._id);
    expect(otherResult.body.data.dailyChallenge.matched).toBe(false);

    const targetResult = await playAndCompleteGame(accessToken, targetGame, child._id);
    expect(targetResult.body.data.dailyChallenge.matched).toBe(true);
    expect(targetResult.body.data.dailyChallenge.justCompleted).toBe(true);
  });
});
