const { Schema, model } = require("mongoose");
const { AGE_RANGES } = require("../../config/constants");

const ChildProfileSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    // Identity — first-name-only by convention; no email/password field
    // exists anywhere on this schema. That is the structural enforcement
    // of "children never hold their own login credential."
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    ageRange: { type: String, enum: AGE_RANGES, required: true },
    birthYear: {
      type: Number,
      min: 2000,
      max: new Date().getFullYear(),
    }, // coarse, optional — never a full date of birth
    avatarConfigId: { type: Schema.Types.ObjectId, ref: "AvatarConfiguration" },
    avatarColor: { type: String, enum: ["primary", "secondary", "accent", "neutral"], default: "primary" },

    // Learning
    currentLevel: { type: Number, default: 1, min: 1 },
    totalXP: { type: Number, default: 0, min: 0 },
    badges: [{ type: Schema.Types.ObjectId, ref: "Achievement" }],
    unlockedRegions: [{ type: Schema.Types.ObjectId, ref: "Region" }],

    progressStats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesCompleted: { type: Number, default: 0 },
      recipesStarted: { type: Number, default: 0 },
      recipesCompleted: { type: Number, default: 0 },
      foodsTried: { type: Number, default: 0 },
      nutritionQuestsCompleted: { type: Number, default: 0 },
    },

    // Gamification
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastActivityDate: { type: Date },
    dailyChallengeProgress: {
      challengeId: { type: Schema.Types.ObjectId, ref: "DailyChallenge" },
      progress: { type: Number, default: 0 },
      completedAt: { type: Date },
    },

    // Preferences — all optional, all parent-editable
    preferences: {
      favoriteFoods: { type: [String], default: [] },
      dislikedFoods: { type: [String], default: [] },
      dietaryPreferences: { type: [String], default: [] },
      // Safety-critical: excluded from default query results. Only the
      // specific recipe-safety and parent-dashboard services that need it
      // should ever .select("+preferences.allergies").
      allergies: { type: [String], default: [], select: false },
      accessibilityPreferences: {
        reducedMotion: { type: Boolean, default: false },
        largeText: { type: Boolean, default: false },
        audioNarration: { type: Boolean, default: false },
        captions: { type: Boolean, default: false },
      },
    },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChildProfileSchema.index({ familyId: 1, deletedAt: 1 });
ChildProfileSchema.index({ ageRange: 1 });

module.exports = model("ChildProfile", ChildProfileSchema);
