const { z } = require("zod");

const createAchievementSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1),
  icon: z.string().optional(),
  category: z.enum(["exploration", "cooking", "nutrition", "streak", "social", "mastery"]),
  // Rule-engine payload -- shape depends on `type` (e.g. "recipesCompleted",
  // "gameStarsAtLeast"), validated loosely here (must be an object with a
  // `type` string) since the full awarding-rule vocabulary is finalized
  // when the runtime unlock-checking logic is built in a later phase.
  unlockCriteria: z.object({ type: z.string().min(1) }).passthrough(),
  xpReward: z.number().int().min(0).default(0),
  rarity: z.enum(["common", "uncommon", "rare", "legendary"]).default("common"),
});

const updateAchievementSchema = createAchievementSchema.partial();

module.exports = { createAchievementSchema, updateAchievementSchema };
