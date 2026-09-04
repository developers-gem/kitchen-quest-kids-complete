const { Schema } = require("mongoose");
const { ALL_STATUSES } = require("./contentWorkflow");

/**
 * Spread into every content schema (Game, Recipe, Region, NutritionLesson,
 * FoodFact, Achievement) so "Track: created by, updated by, published by,
 * version" is satisfied identically everywhere, instead of each schema
 * hand-rolling its own subset of these fields.
 *
 * Usage: `new Schema({ ...otherFields, ...auditableContentFields() })`
 */
function auditableContentFields() {
  return {
    status: { type: String, enum: ALL_STATUSES, default: "draft" },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
  };
}

module.exports = { auditableContentFields };
