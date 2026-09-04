const Achievement = require("./achievement.model");
const ChildAchievement = require("./childAchievement.model");
const { evaluateUnlockRule } = require("../../utils/unlockRuleEngine");
const { awardXp } = require("../gamification/gamification.service");

/**
 * The achievement engine deliberately reuses `evaluateUnlockRule` --
 * Achievement.unlockCriteria and Game/Region.unlockRequirements are the
 * same kind of thing (a data-driven rule evaluated against a child's
 * current state), so this is one rule vocabulary shared across unlocking
 * regions/games/recipes/cosmetics AND awarding achievements, not two
 * separate engines that could drift out of sync on what "streakAtLeast"
 * means.
 *
 * Call this after any event that could plausibly satisfy an achievement:
 * game completion, recipe completion, streak update. It's safe (and
 * cheap enough) to call after every such event -- it only does real work
 * for achievements the child hasn't already earned, and most children
 * will have a small number of outstanding achievements at any time.
 *
 * @param {import('mongoose').Document} child - mutated in place (badges array, and XP via awardXp)
 * @returns {Promise<Array<{_id, title, description, icon, category, rarity, xpReward}>>} newly earned achievements this call
 */
async function checkAndAwardAchievements(child) {
  const [publishedAchievements, alreadyEarned] = await Promise.all([
    Achievement.find({ status: "published" }),
    ChildAchievement.find({ child: child._id }),
  ]);

  const earnedAchievementIds = new Set(alreadyEarned.map((ca) => String(ca.achievement)));
  const candidates = publishedAchievements.filter((a) => !earnedAchievementIds.has(String(a._id)));

  const newlyEarned = [];

  for (const achievement of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const met = await evaluateUnlockRule(achievement.unlockCriteria, { child });
    if (!met) continue;

    // eslint-disable-next-line no-await-in-loop
    await ChildAchievement.create({
      child: child._id,
      achievement: achievement._id,
      progressSnapshot: snapshotStats(child),
    });

    child.badges = [...child.badges, achievement._id];

    if (achievement.xpReward > 0) {
      // eslint-disable-next-line no-await-in-loop
      await awardXp({
        child,
        sourceType: "achievement",
        sourceId: achievement._id,
        amount: achievement.xpReward,
        reason: `Earned the "${achievement.title}" achievement!`,
        metadata: { category: achievement.category, rarity: achievement.rarity },
      });
    }

    newlyEarned.push({
      _id: achievement._id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      rarity: achievement.rarity,
      xpReward: achievement.xpReward,
    });
  }

  return newlyEarned;
}

function snapshotStats(child) {
  return {
    currentLevel: child.currentLevel,
    totalXP: child.totalXP,
    currentStreak: child.currentStreak,
    longestStreak: child.longestStreak,
    ...(child.progressStats.toObject ? child.progressStats.toObject() : child.progressStats),
  };
}

async function listEarnedAchievements(childId) {
  const earned = await ChildAchievement.find({ child: childId }).sort({ earnedAt: -1 });
  const achievementIds = earned.map((e) => e.achievement);
  const achievements = await Promise.all(achievementIds.map((id) => Achievement.findById(id)));
  const byId = new Map(achievements.filter(Boolean).map((a) => [String(a._id), a]));

  return earned
    .map((e) => {
      const achievement = byId.get(String(e.achievement));
      if (!achievement) return null;
      return {
        _id: achievement._id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        rarity: achievement.rarity,
        earnedAt: e.earnedAt,
      };
    })
    .filter(Boolean);
}

module.exports = { checkAndAwardAchievements, listEarnedAchievements };
