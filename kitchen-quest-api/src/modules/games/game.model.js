const { Schema, model } = require("mongoose");
const { AGE_RANGES } = require("../../config/constants");
const { GAME_TYPES } = require("./gameType.schemas");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

const GameSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },

    region: { type: Schema.Types.ObjectId, ref: "Region" },
    state: { type: String }, // denormalized display label for fast card rendering

    gameType: { type: String, enum: GAME_TYPES, required: true },
    ageGroups: { type: [{ type: String, enum: AGE_RANGES }], required: true, validate: (v) => v.length > 0 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },

    description: { type: String },
    learningObjectives: { type: [String], default: [] },
    nutritionTopics: { type: [String], default: [] },
    foodTopics: { type: [String], default: [] },
    instructions: { type: String },

    assetConfig: { type: Schema.Types.Mixed }, // sprite/background asset keys — frontend rendering concern only
    // The actual game content. Shape is gameType-specific and validated at
    // the application layer (gameType.schemas.js), not by Mongoose, so a
    // new gameType never requires a schema migration here.
    configuration: { type: Schema.Types.Mixed, required: true },

    xpReward: { type: Number, default: 20, min: 0 }, // XP for a full (3-star) first completion
    maxStars: { type: Number, default: 3, min: 1, max: 5 },

    unlockRequirements: { type: Schema.Types.Mixed, default: { type: "always" } },

    ...auditableContentFields(),
  },
  { timestamps: true }
);

GameSchema.index({ status: 1, ageGroups: 1 });
GameSchema.index({ gameType: 1 });
GameSchema.index({ region: 1 });

module.exports = model("Game", GameSchema);
