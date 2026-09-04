const DailyChallenge = require("./dailyChallenge.model");
const ChildChallengeProgress = require("./childChallengeProgress.model");
const { awardXp } = require("../gamification/gamification.service");

/**
 * Finds the published challenge whose date window covers `now` and whose
 * age-group list includes the child's ageRange. If more than one somehow
 * matches (an admin scheduling overlap), the earliest-created one wins --
 * deterministic, and an admin-data-hygiene problem to fix on their end,
 * not something to silently pick randomly for.
 *
 * Returns null if nothing is scheduled -- callers must treat that as a
 * legitimate, expected state (see the model's doc comment on why this
 * never fabricates a challenge).
 */
async function getActiveChallengeForChild(child, now = new Date()) {
  const candidates = await DailyChallenge.find({
    status: "published",
    applicableAgeGroups: child.ageRange,
  }).sort({ createdAt: 1 });

  return (
    candidates.find((c) => {
      const start = new Date(c.dateRange.startDate).getTime();
      const end = new Date(c.dateRange.endDate).getTime();
      const t = now.getTime();
      return t >= start && t <= end;
    }) || null
  );
}

async function getOrCreateProgress(child, challenge) {
  let progress = await ChildChallengeProgress.findOne({ child: child._id, challenge: challenge._id });
  if (!progress) {
    progress = await ChildChallengeProgress.create({ child: child._id, challenge: challenge._id, progress: 0 });
  }
  return progress;
}

/** What today's challenge (if any) looks like for this child, read-only --
 * used by the dashboard / a dedicated GET endpoint. Never mutates. */
async function getChallengeStatus(child, now = new Date()) {
  const challenge = await getActiveChallengeForChild(child, now);
  if (!challenge) return { challenge: null, progress: null };

  const progress = await getOrCreateProgress(child, challenge);
  const targetCount = challenge.target.count ?? 1;

  return {
    challenge: {
      _id: challenge._id,
      title: challenge.title,
      description: challenge.description,
      challengeType: challenge.challengeType,
      xpReward: challenge.xpReward,
      targetCount,
    },
    progress: {
      current: progress.progress,
      target: targetCount,
      completed: Boolean(progress.completedAt),
    },
  };
}

/**
 * Called from the games/recipes completion flows after every successful
 * completion (replay included -- a daily challenge is about "did you do
 * this today," not "is this the first time ever"). Matches the event
 * against whatever challenge is active for this child today; if it
 * matches and the challenge isn't already completed, increments progress
 * and awards XP exactly once when the target is reached.
 *
 * Idempotent by construction: once `progress.completedAt` is set, this
 * function becomes a no-op for that challenge regardless of how many more
 * matching events occur that day.
 *
 * @param {import('mongoose').Document} child - mutated in place if XP is awarded
 * @param {{ eventType: "game"|"recipe", gameId?: string, recipeId?: string }} event
 * @returns {Promise<{ matched: boolean, justCompleted: boolean, xpAwarded: number }>}
 */
async function recordChallengeProgress(child, event, now = new Date()) {
  const challenge = await getActiveChallengeForChild(child, now);
  if (!challenge) return { matched: false, justCompleted: false, xpAwarded: 0 };

  if (!eventMatchesChallenge(event, challenge)) {
    return { matched: false, justCompleted: false, xpAwarded: 0 };
  }

  const progressDoc = await getOrCreateProgress(child, challenge);
  if (progressDoc.completedAt) {
    return { matched: true, justCompleted: false, xpAwarded: 0 };
  }

  const targetCount = challenge.target.count ?? 1;
  progressDoc.progress = Math.min(targetCount, progressDoc.progress + 1);

  let xpAwarded = 0;
  let justCompleted = false;

  if (progressDoc.progress >= targetCount) {
    progressDoc.completedAt = now;
    justCompleted = true;

    if (challenge.xpReward > 0) {
      await awardXp({
        child,
        sourceType: "dailyChallenge",
        sourceId: challenge._id,
        amount: challenge.xpReward,
        reason: `Completed today's challenge: ${challenge.title}`,
      });
      xpAwarded = challenge.xpReward;
    }
    progressDoc.xpAwarded = xpAwarded;
  }

  await progressDoc.save();

  return { matched: true, justCompleted, xpAwarded };
}

function eventMatchesChallenge(event, challenge) {
  switch (challenge.challengeType) {
    case "completeAnyGame":
      return event.eventType === "game";
    case "completeSpecificGame":
      return event.eventType === "game" && String(event.gameId) === String(challenge.target.gameId);
    case "completeAnyRecipe":
      return event.eventType === "recipe";
    case "completeSpecificRecipe":
      return event.eventType === "recipe" && String(event.recipeId) === String(challenge.target.recipeId);
    default:
      return false;
  }
}

module.exports = { getActiveChallengeForChild, getChallengeStatus, recordChallengeProgress };
