const { Schema, model } = require("mongoose");
const { AGE_RANGES } = require("../../config/constants");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * A short, standalone "did you know?" fact about a food -- lighter-weight
 * than a full NutritionLesson, meant for quick surfacing (e.g. shown
 * after completing a recipe, or on a food's detail card) rather than a
 * dedicated lesson screen. Kept as its own content type rather than a
 * field on Ingredient/Recipe because admins need to author, review, and
 * publish these independently of any specific recipe or ingredient
 * catalog entry.
 */
const FoodFactSchema = new Schema(
  {
    foodName: { type: String, required: true, trim: true },
    fact: { type: String, required: true, maxlength: 280 },
    ageGroups: { type: [{ type: String, enum: AGE_RANGES }], required: true, validate: (v) => v.length > 0 },
    topic: { type: String }, // e.g. "vitamin-c", "fun-fact", "history"
    image: { type: String },
    ...auditableContentFields(),
  },
  { timestamps: true }
);

FoodFactSchema.index({ status: 1, ageGroups: 1 });
FoodFactSchema.index({ foodName: 1 });

module.exports = model("FoodFact", FoodFactSchema);
