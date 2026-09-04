const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const Achievement = require("./achievement.model");
const ChildAchievement = require("./childAchievement.model");
const { listEarnedAchievements } = require("./achievementEngine.service");
const { getOwnedChild } = require("../../utils/getOwnedChild");



/** GET /achievements/earned?childId= -- just what this child has earned,
 * for a "your badges" display. */
const getEarned = asyncHandler(async (req, res) => {
  await getOwnedChild(req.query.childId, req.user.organizationId);
  const data = await listEarnedAchievements(req.query.childId);
  sendSuccess(res, { data });
});

/** GET /achievements/catalog?childId= -- every published achievement,
 * each flagged with whether this child has earned it -- powers a "here's
 * everything you could earn" browsing view, distinct from the games/
 * recipes/regions "locked" pattern since achievements are never
 * *prerequisites* to reach other content, just a record of accomplishment,
 * so there's no separate "locked" concept here beyond earned/not-earned. */
const getCatalog = asyncHandler(async (req, res) => {
  await getOwnedChild(req.query.childId, req.user.organizationId);

  const [achievements, earnedRecords] = await Promise.all([
    Achievement.find({ status: "published" }),
    ChildAchievement.find({ child: req.query.childId }),
  ]);
  const earnedIds = new Set(earnedRecords.map((r) => String(r.achievement)));

  const data = achievements.map((a) => ({
    _id: a._id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    category: a.category,
    rarity: a.rarity,
    xpReward: a.xpReward,
    earned: earnedIds.has(String(a._id)),
  }));

  sendSuccess(res, { data });
});

module.exports = { getEarned, getCatalog };
