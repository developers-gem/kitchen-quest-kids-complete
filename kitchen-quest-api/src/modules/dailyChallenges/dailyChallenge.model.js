const { Schema, model } = require("mongoose");
const { AGE_RANGES } = require("../../config/constants");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * Admin-authored content, following the same draft/review/published/
 * archived workflow as every other content type (so it plugs directly
 * into the admin CMS's generic factory) -- an admin schedules a
 * challenge for a date window; the child-facing side never fabricates
 * one. If no published challenge's dateRange covers "today," the
 * dashboard shows an honest empty state rather than inventing content
 * (see dailyChallenge.service.js).
 */
const DailyChallengeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    challengeType: {
      type: String,
      enum: ["completeAnyGame", "completeSpecificGame", "completeAnyRecipe", "completeSpecificRecipe"],
      required: true,
    },
    // Shape depends on challengeType:
    //   completeAnyGame / completeAnyRecipe:        { count: number }
    //   completeSpecificGame:   { gameId, count: number }
    //   completeSpecificRecipe: { recipeId, count: number }
    target: { type: Schema.Types.Mixed, required: true },
    xpReward: { type: Number, default: 25, min: 0 },
    dateRange: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    applicableAgeGroups: { type: [{ type: String, enum: AGE_RANGES }], default: () => [...AGE_RANGES] },
    ...auditableContentFields(),
  },
  { timestamps: true }
);

DailyChallengeSchema.index({ status: 1, "dateRange.startDate": 1, "dateRange.endDate": 1 });

module.exports = model("DailyChallenge", DailyChallengeSchema);
