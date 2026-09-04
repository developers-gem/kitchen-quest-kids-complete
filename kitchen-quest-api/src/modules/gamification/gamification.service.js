const XPTransaction = require("../xp/xpTransaction.model");
const { calculateLevel, updateStreak } = require("../../utils/xpEngine");
const { XP_REWARDS, STREAK_MILESTONES } = require("./gamification.config");

/**
 * =============================================================================
 * THE GAMIFICATION ENGINE -- single source of truth for XP, levels, streaks
 * =============================================================================
 * Before this module existed, `game.service.js` and `recipe.service.js`
 * each independently created an XPTransaction and mutated
 * child.totalXP/currentLevel/currentStreak/longestStreak inline -- two
 * near-identical copies of the same logic, with no shared code path to
 * guarantee they stayed in sync if one was ever tweaked and the other
 * wasn't. This module replaces both call sites: every XP award and every
 * streak update in the entire system goes through exactly these two
 * functions.
 *
 * Hard invariant this module enforces: **`child.totalXP` is never
 * mutated directly anywhere else in the codebase.** `awardXp` is the only
 * function allowed to change it, and it always writes an XPTransaction
 * first. If you find yourself writing `child.totalXP += ...` outside this
 * file, that's a bug -- route it through `awardXp` instead so the ledger
 * stays complete.
 * =============================================================================
 */

/**
 * Awards XP to a child, always recording the source. Never call this with
 * a client-supplied amount -- `amount` must always be a value the server
 * itself computed (a game's scored performance, a recipe's fixed reward,
 * an achievement's configured xpReward, etc.).
 *
 * Mutates `child` in place (does NOT call child.save() -- the caller is
 * expected to be in the middle of its own save, e.g. after also updating
 * progressStats, and batching into one save() call is more efficient than
 * this function saving separately). This is a deliberate, documented
 * exception to "services own their persistence" for exactly this one
 * high-frequency path.
 *
 * @param {object} params
 * @param {import('mongoose').Document} params.child - a ChildProfile document, mutated in place
 * @param {"game"|"recipe"|"dailyChallenge"|"achievement"|"lesson"|"streak"|"bonus"} params.sourceType
 * @param {import('mongoose').Types.ObjectId|string} params.sourceId
 * @param {number} params.amount - must be >= 0; zero is a no-op (no transaction written)
 * @param {string} params.reason - human-readable, shown in activity feeds
 * @param {object} [params.metadata]
 * @returns {Promise<{ totalXP: number, currentLevel: number, leveledUp: boolean, previousLevel: number }>}
 */
async function awardXp({ child, sourceType, sourceId, amount, reason, metadata }) {
  if (amount < 0) {
    throw new Error(
      "awardXp: amount must not be negative -- corrections should be modeled as their own transaction type, not a negative award"
    );
  }

  const previousLevel = child.currentLevel;

  if (amount === 0) {
    return { totalXP: child.totalXP, currentLevel: child.currentLevel, leveledUp: false, previousLevel };
  }

  await XPTransaction.create({
    childProfile: child._id,
    sourceType,
    sourceId,
    amount,
    reason,
    metadata,
  });

  child.totalXP += amount;
  child.currentLevel = calculateLevel(child.totalXP);

  return {
    totalXP: child.totalXP,
    currentLevel: child.currentLevel,
    leveledUp: child.currentLevel > previousLevel,
    previousLevel,
  };
}

/**
 * Records that a child was active "today" (in the given timezone) and
 * updates their streak accordingly. This is the ONLY function that
 * mutates child.currentStreak/longestStreak/lastActivityDate -- same
 * single-source-of-truth guarantee as awardXp.
 *
 * "What counts as activity": completing a game session, completing a
 * recipe, or completing a daily challenge -- i.e. any call site that
 * already calls `awardXp` for a completion event should also call this.
 * Starting a game/recipe (without finishing) does NOT count -- browsing
 * doesn't extend a streak, finishing something does.
 *
 * If a streak milestone (see gamification.config.js) is reached, awards
 * a bonus via `awardXp` automatically -- callers don't need to check for
 * milestones themselves.
 *
 * Mutates `child` in place, same batching rationale as `awardXp`.
 *
 * @param {import('mongoose').Document} child
 * @param {string} [timezone] - IANA timezone string, typically the owning parent's User.timezone
 * @param {Date} [now]
 * @returns {Promise<{ currentStreak: number, streakIncreased: boolean, streakBroken: boolean, milestoneReached: number|null }>}
 */
async function recordActivity(child, timezone = "UTC", now = new Date()) {
  const { currentStreak, streakIncreased, streakBroken } = updateStreak(
    { currentStreak: child.currentStreak, lastActivityDate: child.lastActivityDate, timezone },
    now
  );

  child.currentStreak = currentStreak;
  child.longestStreak = Math.max(child.longestStreak, currentStreak);
  child.lastActivityDate = now;

  let milestoneReached = null;
  if (streakIncreased && STREAK_MILESTONES.includes(currentStreak)) {
    milestoneReached = currentStreak;
    await awardXp({
      child,
      sourceType: "streak",
      sourceId: child._id, // no separate "streak" document exists; the child's own id anchors the ledger entry
      amount: XP_REWARDS.STREAK_MILESTONE_BONUS,
      reason: `${currentStreak}-day streak bonus!`,
      metadata: { milestone: currentStreak },
    });
  }

  return { currentStreak, streakIncreased, streakBroken, milestoneReached };
}

module.exports = { awardXp, recordActivity };
