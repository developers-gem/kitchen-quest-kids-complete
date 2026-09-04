const { Schema, model } = require("mongoose");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * Content-side of the achievements system (admin-authored, shared across
 * all children) -- referenced by `ChildProfile.badges` and the future
 * `ChildAchievement` join collection (per the database architecture doc)
 * that records *who* earned *which* achievement *when*. That join
 * collection and the runtime unlock-checking logic are a later phase
 * (awarding achievements requires wiring into the games/recipes
 * completion flows); this model and its admin CRUD are what's needed to
 * let an admin define achievements without touching code, which is this
 * phase's actual scope.
 */
const AchievementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    icon: { type: String }, // storage key
    category: {
      type: String,
      enum: ["exploration", "cooking", "nutrition", "streak", "social", "mastery"],
      required: true,
    },
    // Rule-engine payload, e.g. { type: "recipesCompleted", value: 5 } or
    // { type: "gameStarsAtLeast", gameId, stars: 3 } -- evaluated by the
    // same class of unlock-rule engine games/regions/recipes already use
    // (utils/unlockRuleEngine.js), extended with achievement-specific
    // rule types when the awarding logic is built.
    unlockCriteria: { type: Schema.Types.Mixed, required: true },
    xpReward: { type: Number, default: 0, min: 0 },
    rarity: { type: String, enum: ["common", "uncommon", "rare", "legendary"], default: "common" },
    ...auditableContentFields(),
  },
  { timestamps: true }
);

AchievementSchema.index({ status: 1, category: 1 });

module.exports = model("Achievement", AchievementSchema);
