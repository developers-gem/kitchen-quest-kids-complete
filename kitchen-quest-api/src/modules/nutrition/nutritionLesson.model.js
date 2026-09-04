const { Schema, model } = require("mongoose");
const { AGE_RANGES } = require("../../config/constants");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * A standalone piece of nutrition curriculum -- distinct from a mini-game
 * (games/game.model.js) even though its optional `quiz` field reuses the
 * exact same "quiz" gameType config/scoring shape from
 * games/gameType.schemas.js, per the original database design's explicit
 * call to avoid inventing a second quiz format. A NutritionLesson is
 * read/learn content with an optional check-for-understanding, not a
 * mini-game in the Flavor Hub.
 */
const NutritionLessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    ageGroups: { type: [{ type: String, enum: AGE_RANGES }], required: true, validate: (v) => v.length > 0 },
    topic: { type: String, required: true }, // e.g. "fiber", "food-safety"
    content: { type: String, required: true }, // rich text/markdown body
    media: { type: [String], default: [] }, // image/short-video storage keys
    learningObjectives: { type: [String], default: [] },
    // Optional check-for-understanding. Shape validated at the
    // application layer against the same schema games/gameType.schemas.js
    // uses for gameType: "quiz" -- intentional reuse, not duplication.
    quiz: { type: Schema.Types.Mixed },
    xpReward: { type: Number, default: 15, min: 0 },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
    ...auditableContentFields(),
  },
  { timestamps: true }
);

NutritionLessonSchema.index({ status: 1, ageGroups: 1 });
NutritionLessonSchema.index({ topic: 1 });
NutritionLessonSchema.index({ region: 1 });

module.exports = model("NutritionLesson", NutritionLessonSchema);
