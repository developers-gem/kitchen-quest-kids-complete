const { Schema, model } = require("mongoose");
const { AGE_RANGES } = require("../../config/constants");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * Each ingredient line. `ingredientRef` is optional (per the DB design
 * doc) — not every line needs a full Ingredient-catalog entry, e.g. "lime
 * wedge for garnish". `category` drives grocery-list aisle grouping.
 */
const IngredientLineSchema = new Schema(
  {
    ingredientRef: { type: Schema.Types.ObjectId, ref: "Ingredient" },
    name: { type: String, required: true },
    quantity: { type: Number },
    unit: {
      type: String,
      enum: ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "fl_oz", "oz", "lb", "count", "pinch", null],
      default: null,
    },
    category: { type: String, required: true }, // grocery aisle, e.g. "Produce"
    optional: { type: Boolean, default: false },
    substitutes: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * `instruction` is the full parent-mode text; `simpleInstruction` is an
 * optional child-friendly rephrasing shown one-at-a-time in child mode.
 * Falls back to `instruction` if not authored — content authors aren't
 * forced to write two versions of every step on day one.
 */
const RecipeStepSchema = new Schema(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    simpleInstruction: { type: String },
    image: { type: String },
    video: { type: String },
    audioNarration: { type: String },
    estimatedDurationSeconds: { type: Number },
    safetyLevel: { type: String, enum: ["none", "lowHeat", "highHeat", "sharpTool"], default: "none" },
    parentAssistanceRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const RecipeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 160 },
    coverImage: { type: String },
    gallery: { type: [String], default: [] },

    cuisine: { type: String },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
    ageGroups: { type: [{ type: String, enum: AGE_RANGES }], required: true, validate: (v) => v.length > 0 },
    difficulty: { type: String, enum: ["easy", "medium"], default: "easy" },
    preparationTimeMinutes: { type: Number, required: true, min: 0 },
    cookingTimeMinutes: { type: Number, required: true, min: 0 },
    totalTimeMinutes: { type: Number, required: true, min: 0 },

    ingredients: { type: [IngredientLineSchema], required: true, validate: (v) => v.length > 0 },
    steps: { type: [RecipeStepSchema], required: true, validate: (v) => v.length > 0 },

    cookingSkills: { type: [String], default: [] },
    nutritionLearning: { type: [String], default: [] }, // free-text learning points; full NutritionLesson linkage is a later module
    funFacts: { type: [String], default: [] },
    learningObjectives: { type: [String], default: [] },

    xpReward: { type: Number, default: 40, min: 0 },
    unlockRequirements: { type: Schema.Types.Mixed, default: { type: "always" } },

    supervisionRequired: { type: Boolean, default: true },
    knifeSafety: { type: Boolean, default: false },
    heatSafety: { type: Boolean, default: false },
    allergenInformation: { type: [String], default: [] },
    // Whether a parent must explicitly verify this was actually cooked
    // before XP is awarded — true by default for anything touching heat
    // or knives, since that happens off-screen and unlike a tap-to-play
    // game can't be inferred from in-app interaction alone.
    requiresParentVerification: { type: Boolean, default: true },

    ...auditableContentFields(),
  },
  { timestamps: true }
);

RecipeSchema.index({ status: 1, ageGroups: 1 });
RecipeSchema.index({ allergenInformation: 1 });
RecipeSchema.index({ difficulty: 1 });

module.exports = model("Recipe", RecipeSchema);
