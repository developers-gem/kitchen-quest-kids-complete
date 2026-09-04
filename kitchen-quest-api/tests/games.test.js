const request = require("supertest");
const createApp = require("../src/app");
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
      prompt: "Which food is a good source of fiber?",
      options: [
        { id: "a", text: "Apple" },
        { id: "b", text: "Candy bar" },
      ],
      correctOptionId: "a",
    },
    {
      id: "q2",
      prompt: "Which of these is a whole grain?",
      options: [
        { id: "a", text: "White bread" },
        { id: "b", text: "Whole wheat bread" },
      ],
      correctOptionId: "b",
    },
  ],
};

async function createPublishedQuizGame(overrides = {}) {
  return Game.create({
    title: "Big Apple Crunch",
    slug: `big-apple-crunch-${Date.now()}-${Math.random()}`,
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

describe("Games: listing and detail", () => {
  it("lists only published games, hiding configuration", async () => {
    const accessToken = await registerParent();
    await createPublishedQuizGame();
    await Game.create({
      title: "Unfinished Game",
      slug: `draft-game-${Date.now()}`,
      gameType: "quiz",
      ageGroups: ["7-9"],
      configuration: QUIZ_CONFIG,
      status: "draft",
    });

    const res = await request(app).get("/api/v1/games").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Big Apple Crunch");
    expect(res.body.data[0].configuration).toBeUndefined();
    expect(res.body.meta.total).toBe(1);
  });

  it("enriches the list with unlocked/bestStars when childId is supplied", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    await createPublishedQuizGame();

    const res = await request(app)
      .get(`/api/v1/games?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].unlocked).toBe(true);
    expect(res.body.data[0].bestStars).toBe(0);
  });

  it("get by slug never includes the answer key", async () => {
    const accessToken = await registerParent();
    const game = await createPublishedQuizGame();

    const res = await request(app).get(`/api/v1/games/${game.slug}`).set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.configuration).toBeUndefined();
    expect(res.body.data.title).toBe("Big Apple Crunch");
  });
});

describe("Games: unlock rules", () => {
  it("rejects starting a locked game", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const lockedGame = await createPublishedQuizGame({
      slug: `locked-game-${Date.now()}`,
      unlockRequirements: { type: "levelAtLeast", value: 50 },
    });

    const res = await request(app)
      .post(`/api/v1/games/${lockedGame._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("GAME_LOCKED");
  });

  it("allows starting an always-unlocked game", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await createPublishedQuizGame();

    const res = await request(app)
      .post(`/api/v1/games/${game._id}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId: child._id });

    expect(res.status).toBe(201);
    expect(res.body.data.session.status).toBe("inProgress");
    expect(res.body.data.game.configuration).toBeDefined();
    // The redacted configuration must never leak the answer key.
    res.body.data.game.configuration.questions.forEach((q) => {
      expect(q.correctOptionId).toBeUndefined();
    });
  });
});

describe("Games: session lifecycle and server-side scoring", () => {
  async function startSession(accessToken, gameId, childId) {
    const res = await request(app)
      .post(`/api/v1/games/${gameId}/start`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ childId });
    return res.body.data.session._id;
  }

  it("scores a perfect run as full stars and awards XP, updating the child's totalXP/level", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await createPublishedQuizGame();
    const sessionId = await startSession(accessToken, game._id, child._id);

    const res = await request(app)
      .post(`/api/v1/games/${game._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        sessionId,
        childId: child._id,
        durationSeconds: 45,
        outcome: {
          answers: [
            { questionId: "q1", selectedOptionId: "a" },
            { questionId: "q2", selectedOptionId: "b" },
          ],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.session.score).toBe(2);
    expect(res.body.data.session.scoreTotal).toBe(2);
    expect(res.body.data.session.stars).toBe(3);
    expect(res.body.data.session.xpEarned).toBeGreaterThan(0);
    expect(res.body.data.session.isFirstCompletion).toBe(true);
    // A perfect run also earns the separate "perfect score" bonus (see
    // gamification.config.js's XP_REWARDS.PERFECT_SCORE_BONUS), recorded
    // as its own XPTransaction stacked on top of the completion award --
    // total XP is the sum of both, not just the completion amount alone.
    expect(res.body.data.child.totalXP).toBe(res.body.data.session.xpEarned + 10);
    expect(res.body.data.child.currentLevel).toBe(1);
  });

  it("ignores a client-submitted score and computes correctness from the real answer key", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await createPublishedQuizGame();
    const sessionId = await startSession(accessToken, game._id, child._id);

    const res = await request(app)
      .post(`/api/v1/games/${game._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        sessionId,
        childId: child._id,
        // Attempted spoof: wrong answers plus bogus extra fields.
        outcome: {
          answers: [
            { questionId: "q1", selectedOptionId: "b" }, // wrong
            { questionId: "q2", selectedOptionId: "b" }, // correct
          ],
          score: 9999,
          stars: 3,
          xpEarned: 9999,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.session.score).toBe(1); // only 1 actually correct
    expect(res.body.data.session.xpEarned).toBeLessThan(9999);
  });

  it("rejects completing the same session twice (idempotency / anti-double-reward)", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await createPublishedQuizGame();
    const sessionId = await startSession(accessToken, game._id, child._id);

    const body = {
      sessionId,
      childId: child._id,
      outcome: { answers: [{ questionId: "q1", selectedOptionId: "a" }, { questionId: "q2", selectedOptionId: "b" }] },
    };

    const first = await request(app)
      .post(`/api/v1/games/${game._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(body);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/games/${game._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(body);
    expect(second.status).toBe(409);
  });

  it("awards reduced XP on a replay and enforces the daily XP-completions cap", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await createPublishedQuizGame();

    const perfectOutcome = {
      answers: [
        { questionId: "q1", selectedOptionId: "a" },
        { questionId: "q2", selectedOptionId: "b" },
      ],
    };

    const results = [];
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const sessionId = await startSession(accessToken, game._id, child._id);
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .post(`/api/v1/games/${game._id}/complete`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ sessionId, childId: child._id, outcome: perfectOutcome });
      results.push(res.body.data.session);
    }

    expect(results[0].isFirstCompletion).toBe(true);
    expect(results[0].xpEarned).toBeGreaterThan(0);

    // Replays 2 and 3 (completionRank 2, 3) still earn reduced XP...
    expect(results[1].xpEarned).toBeGreaterThan(0);
    expect(results[1].xpEarned).toBeLessThan(results[0].xpEarned);
    expect(results[2].xpEarned).toBeGreaterThan(0);

    // ...but the daily cap (3 XP-earning completions) means the 4th and
    // 5th completions earn zero XP even though they're scored identically.
    expect(results[3].xpEarned).toBe(0);
    expect(results[3].dailyCapReached).toBe(true);
    expect(results[4].xpEarned).toBe(0);

    // gamesCompleted (distinct-game completion counter) only increments
    // once, on the first completion, not on every replay.
    const progressRes = await request(app)
      .get(`/api/v1/children/${child._id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(progressRes.body.data.progressStats.gamesCompleted).toBe(1);
    expect(progressRes.body.data.progressStats.gamesPlayed).toBe(5);
  });

  it("rejects starting a session for a child not owned by the caller's family", async () => {
    const accessToken = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);
    const game = await createPublishedQuizGame();

    const otherRes = await request(app).post("/api/v1/auth/register").send({ ...parent, email: "other@example.com" });
    const otherToken = otherRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/games/${game._id}/start`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ childId: child._id });
    expect(res.status).toBe(404);
  });
});
