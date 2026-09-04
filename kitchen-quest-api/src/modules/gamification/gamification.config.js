/**
 * Content-specific XP (a particular game's, recipe's, or lesson's reward)
 * lives on that content document itself (`Game.xpReward`, `Recipe.xpReward`,
 * `NutritionLesson.xpReward`, `DailyChallenge.xpReward`,
 * `Achievement.xpReward`) and is authored by an admin through the CMS --
 * that's already "configurable XP" per the admin system.
 *
 * This file is for the handful of XP amounts that AREN'T tied to a piece
 * of admin-authored content -- generic gamification bonuses. Centralizing
 * them here means tuning the game's economy (e.g. "streak bonuses feel
 * too small") is a one-file change, not a hunt through every service
 * that happens to award XP.
 */
const XP_REWARDS = Object.freeze({
  /** Flat bonus added on top of a game's own xpReward when a session
   * scores a perfect ratio (1.0) -- rewards mastery beyond just the
   * star tier, which already scales with performance. */
  PERFECT_SCORE_BONUS: 10,

  /** Awarded once per streak milestone reached (see STREAK_MILESTONES
   * below), separate from and in addition to whatever XP the activity
   * that extended the streak already earned. */
  STREAK_MILESTONE_BONUS: 50,
});

/** Streak lengths (in days) that trigger a one-time milestone bonus.
 * Each milestone fires exactly once per child per streak "run" -- reaching
 * day 7 twice (after a reset) awards the bonus both times, since it's a
 * fresh accomplishment each time, not a lifetime-once achievement (that's
 * what the Achievement system, not this bonus, is for). */
const STREAK_MILESTONES = Object.freeze([7, 14, 30, 60, 100]);

module.exports = { XP_REWARDS, STREAK_MILESTONES };
