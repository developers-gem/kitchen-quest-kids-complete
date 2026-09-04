const Game = require("./game.model");
const GameSession = require("./gameSession.model");
const ApiError = require("../../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../../utils/pagination");
const { evaluateUnlockRule } = require("../../utils/unlockRuleEngine");
const { getFamilyTimezone } = require("../../utils/familyTimezone");
const { validateOutcome, scoreOutcome, redactConfigForClient } = require("./gameType.schemas");
const { ratioToStars, calculateXpEarned } = require("./rewardEngine");
const { awardXp, recordActivity } = require("../gamification/gamification.service");
const { XP_REWARDS } = require("../gamification/gamification.config");
const { checkAndAwardAchievements } = require("../achievements/achievementEngine.service");
const { getOwnedChild } = require("../../utils/getOwnedChild");
const { recordChallengeProgress } = require("../dailyChallenges/dailyChallenge.service");

/** At most this many XP-*earning* completions per child per game per
 * rolling 24h — replaying for fun/practice is always allowed, but only
 * earns XP up to this cap, so scripted replay-spam can't farm rewards. */
const DAILY_XP_COMPLETIONS_CAP = 3;



async function isUnlockedForChild(game, child) {
  return evaluateUnlockRule(game.unlockRequirements, { child, GameSession });
}

async function getBestStarsForChild(childId, gameId) {
  const sessions = await GameSession.find({ childProfile: childId, game: gameId, status: "completed" });
  return Array.isArray(sessions) ? sessions.reduce((max, s) => Math.max(max, s.stars || 0), 0) : 0;
}

/**
 * List published games, optionally enriched with per-child unlock/stars
 * state when a childId is supplied (and owned by the requesting family).
 * Never leaks `configuration` here — list views don't need game content,
 * only metadata.
 */
async function listGames(query, { familyId } = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { status: "published" };
  if (query.ageRange) filter.ageGroups = query.ageRange;
  if (query.gameType) filter.gameType = query.gameType;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.search) filter.title = { $regex: query.search, $options: "i" };

  const [games, total] = await Promise.all([
    Game.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Game.countDocuments(filter),
  ]);

  let child = null;
  if (query.childId && familyId) {
    child = await getOwnedChild(query.childId, familyId).catch(() => null);
  }

  const data = await Promise.all(
    games.map(async (g) => {
      const base = {
        _id: g._id,
        title: g.title,
        slug: g.slug,
        state: g.state,
        gameType: g.gameType,
        ageGroups: g.ageGroups,
        difficulty: g.difficulty,
        description: g.description,
        nutritionTopics: g.nutritionTopics,
        foodTopics: g.foodTopics,
        xpReward: g.xpReward,
        maxStars: g.maxStars,
      };
      if (!child) return base;
      return {
        ...base,
        unlocked: await isUnlockedForChild(g, child),
        bestStars: await getBestStarsForChild(child._id, g._id),
      };
    })
  );

  return { data, meta: buildPaginationMeta({ page, limit, total }) };
}

/** Detail view — includes learning metadata but NOT `configuration`
 * (that's only delivered at /start, redacted, once a session exists). */
async function getBySlug(slug, { familyId, childId } = {}) {
  const game = await Game.findOne({ slug, status: "published" });
  if (!game) throw ApiError.notFound("Game not found");

  let unlockInfo = {};
  if (childId && familyId) {
    const child = await getOwnedChild(childId, familyId);
    unlockInfo = {
      unlocked: await isUnlockedForChild(game, child),
      bestStars: await getBestStarsForChild(child._id, game._id),
    };
  }

  return {
    _id: game._id,
    title: game.title,
    slug: game.slug,
    state: game.state,
    gameType: game.gameType,
    ageGroups: game.ageGroups,
    difficulty: game.difficulty,
    description: game.description,
    learningObjectives: game.learningObjectives,
    nutritionTopics: game.nutritionTopics,
    foodTopics: game.foodTopics,
    instructions: game.instructions,
    xpReward: game.xpReward,
    maxStars: game.maxStars,
    ...unlockInfo,
  };
}

/**
 * Starts a session: verifies ownership, publish status, and the unlock
 * rule (server-side — a locked game can never be started by calling the
 * API directly even if the client UI hides the lock icon). Delivers the
 * REDACTED configuration — this is the only place gameplay content is
 * ever sent to a client.
 */
async function startSession(gameId, childId, familyId) {
  const game = await Game.findOne({ _id: gameId, status: "published" });
  if (!game) throw ApiError.notFound("Game not found");

  const child = await getOwnedChild(childId, familyId);

  const unlocked = await isUnlockedForChild(game, child);
  if (!unlocked) {
    throw new ApiError(403, "GAME_LOCKED", "This game hasn't been unlocked yet");
  }

  const session = await GameSession.create({
    childProfile: child._id,
    game: game._id,
    gameVersion: game.version,
    status: "inProgress",
  });

  child.progressStats.gamesPlayed += 1;
  await child.save();

  return {
    session: {
      _id: session._id,
      status: session.status,
      startedAt: session.startedAt,
    },
    game: {
      _id: game._id,
      title: game.title,
      gameType: game.gameType,
      maxStars: game.maxStars,
      instructions: game.instructions,
      assetConfig: game.assetConfig,
      configuration: redactConfigForClient(game.gameType, game.configuration),
    },
  };
}

/** Lightweight, unauthoritative resume-state save — never used for
 * scoring, only so a child can close the app mid-game and pick up where
 * they left off (e.g. "on question 3 of 5"). */
async function saveProgress(sessionId, childId, familyId, progress) {
  await getOwnedChild(childId, familyId);
  const session = await GameSession.findOne({ _id: sessionId, childProfile: childId, status: "inProgress" });
  if (!session) throw ApiError.notFound("Active game session not found");

  session.outcome = { ...(session.outcome || {}), __resumeState: progress };
  await session.save();
  return { sessionId: session._id, saved: true };
}

/**
 * Completes a session. This is where every anti-abuse rule from the audit
 * is enforced:
 *  - The session must currently be "inProgress" (a session id is single-
 *    use; calling /complete twice on the same session is rejected, not
 *    silently re-rewarded — idempotent from the caller's point of view
 *    since the first response already has the final result).
 *  - The outcome payload is validated against the gameType's schema, then
 *    scored against the game's *stored* configuration (never a
 *    client-supplied score/stars/xp).
 *  - completionRank (how many times this child has completed this game
 *    before) determines full vs. reduced "replay" XP.
 *  - A rolling 24h cap on XP-earning completions per child per game
 *    prevents scripted replay-spam from farming XP even at the reduced
 *    replay rate.
 *  - `progressStats.gamesCompleted` and unlock-relevant state only
 *    increment on a child's genuinely first completion of a given game.
 */
async function completeSession(sessionId, childId, familyId, { outcome, durationSeconds }) {
  const child = await getOwnedChild(childId, familyId);

  const session = await GameSession.findOne({ _id: sessionId, childProfile: childId });
  if (!session) throw ApiError.notFound("Game session not found");
  if (session.status !== "inProgress") {
    throw ApiError.conflict("This session has already been completed");
  }

  const game = await Game.findById(session.game);
  if (!game) throw ApiError.notFound("Game not found");

  const validatedOutcome = validateOutcome(game.gameType, outcome);
  const { correct, total, ratio } = scoreOutcome(game.gameType, game.configuration, validatedOutcome);
  const stars = ratioToStars(ratio, game.maxStars);

  const priorCompletions = await GameSession.countDocuments({
    childProfile: child._id,
    game: game._id,
    status: "completed",
  });
  const completionRank = priorCompletions + 1;
  const isFirstCompletion = priorCompletions === 0;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSessions = await GameSession.find({
    childProfile: child._id,
    game: game._id,
    status: "completed",
  });
  const recentXpCount = Array.isArray(recentSessions)
    ? recentSessions.filter((s) => s.xpEarned > 0 && new Date(s.completedAt || s.createdAt) >= since).length
    : 0;

  const dailyCapReached = recentXpCount >= DAILY_XP_COMPLETIONS_CAP;
  const rawXp = calculateXpEarned({
    xpReward: game.xpReward,
    ratio,
    stars,
    maxStars: game.maxStars,
    completionRank,
  });
  const xpEarned = dailyCapReached ? 0 : rawXp;

  session.completedAt = new Date();
  session.score = correct;
  session.scoreTotal = total;
  session.ratio = ratio;
  session.stars = stars;
  session.durationSeconds = durationSeconds;
  session.xpEarned = xpEarned;
  session.status = "completed";
  session.outcome = validatedOutcome;
  session.isFirstCompletionForGame = isFirstCompletion;
  await session.save();

  // --- Everything from here on routes through the central gamification
  // engine (src/modules/gamification/) -- this function never touches
  // child.totalXP/currentStreak/longestStreak directly. See that
  // module's doc comment for the hard invariant this enforces.

  if (xpEarned > 0) {
    await awardXp({
      child,
      sourceType: "game",
      sourceId: game._id,
      amount: xpEarned,
      reason: `Completed ${game.title}${isFirstCompletion ? "" : " (replay)"} — ${stars} star${stars === 1 ? "" : "s"}`,
      metadata: { sessionId: session._id, stars, ratio, completionRank },
    });

    // "Perfect score" is its own XP source (per the gamification spec),
    // stacked on top of the base completion award -- a separate ledger
    // entry, not folded into the amount above, so an activity feed can
    // show "Completed Big Apple Crunch" and "Perfect score bonus!" as two
    // distinct lines rather than one opaque number.
    if (ratio >= 1 && XP_REWARDS.PERFECT_SCORE_BONUS > 0) {
      await awardXp({
        child,
        sourceType: "bonus",
        sourceId: game._id,
        amount: XP_REWARDS.PERFECT_SCORE_BONUS,
        reason: `Perfect score on ${game.title}!`,
        metadata: { sessionId: session._id },
      });
    }
  }

  const timezone = await getFamilyTimezone(familyId);
  const { currentStreak, streakIncreased } = await recordActivity(child, timezone);

  if (isFirstCompletion) {
    child.progressStats.gamesCompleted += 1;
  }
  await child.save();

  // Achievement checking and daily-challenge progress happen after the
  // save above so both read a child document already reflecting this
  // session's XP/streak/stats -- an achievement like "7-day streak" must
  // see today's streak update to fire on the correct completion.
  // Sequential, not Promise.all: the daily-challenge check runs first so
  // any XP it awards is already reflected on `child` by the time
  // achievement criteria are evaluated (e.g. a "reach level 5" achievement
  // should see the challenge's XP if that's what pushes the child over).
  const challengeResult = await recordChallengeProgress(child, { eventType: "game", gameId: game._id });
  const newlyEarnedAchievements = await checkAndAwardAchievements(child);
  // Both calls above may have mutated child (badges[], totalXP via
  // awardXp) without saving -- one final save covers either or both.
  await child.save();

  return {
    session: {
      _id: session._id,
      status: session.status,
      score: correct,
      scoreTotal: total,
      stars,
      xpEarned,
      completionRank,
      isFirstCompletion,
      dailyCapReached,
    },
    child: {
      totalXP: child.totalXP,
      currentLevel: child.currentLevel,
      currentStreak: child.currentStreak,
      streakIncreased,
    },
    newlyEarnedAchievements,
    dailyChallenge: challengeResult,
  };
}

module.exports = { listGames, getBySlug, startSession, saveProgress, completeSession };
