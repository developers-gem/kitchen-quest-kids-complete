const { Schema, model } = require("mongoose");

/**
 * Join collection between ChildProfile and Achievement -- the source of
 * truth for "has this child earned this achievement." ChildProfile.badges
 * is a denormalized quick-list kept in sync by achievementEngine.service.js
 * (append-only, never removed from there once earned), matching the same
 * "content vs. progress never duplicated as the source of truth" pattern
 * used throughout this codebase (GameSession vs Game, RecipeProgress vs
 * Recipe, etc.).
 */
const ChildAchievementSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: "ChildProfile", required: true, index: true },
    achievement: { type: Schema.Types.ObjectId, ref: "Achievement", required: true },
    earnedAt: { type: Date, default: Date.now },
    // What the child's stats looked like at the moment of earning -- lets
    // a "you earned this because..." UI show concrete numbers ("5/5
    // recipes cooked!") without re-deriving them later from a stats
    // snapshot that may have since moved on.
    progressSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// A child can only earn a given achievement once.
ChildAchievementSchema.index({ child: 1, achievement: 1 }, { unique: true });
ChildAchievementSchema.index({ child: 1, earnedAt: -1 });

module.exports = model("ChildAchievement", ChildAchievementSchema);
