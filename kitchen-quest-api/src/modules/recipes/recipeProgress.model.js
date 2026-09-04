const { Schema, model } = require("mongoose");

const RecipeProgressSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: "ChildProfile", required: true, index: true },
    recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    recipeVersion: { type: Number },

    status: { type: String, enum: ["inProgress", "paused", "completed", "abandoned"], default: "inProgress" },
    currentStepIndex: { type: Number, default: 0 }, // 0-based; equals steps.length once all steps are done
    completedStepIndices: { type: [Number], default: [] },

    startedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date },
    completedAt: { type: Date },

    xpEarned: { type: Number, default: 0, min: 0 },
    // A recipe can be "completed" by the child (all steps walked through)
    // before a parent has verified it actually happened in the kitchen —
    // these are deliberately separate booleans/timestamps.
    parentVerified: { type: Boolean, default: false },
    parentVerifiedAt: { type: Date },

    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

RecipeProgressSchema.index({ child: 1, recipe: 1, createdAt: -1 });
RecipeProgressSchema.index({ child: 1, status: 1 });

module.exports = model("RecipeProgress", RecipeProgressSchema);
