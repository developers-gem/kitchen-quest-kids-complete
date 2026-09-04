const { Schema, model } = require("mongoose");

const GameSessionSchema = new Schema(
  {
    childProfile: { type: Schema.Types.ObjectId, ref: "ChildProfile", required: true, index: true },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    gameVersion: { type: Number }, // snapshot of Game.version at play time

    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },

    // All of the below are SERVER-COMPUTED at /complete time from the
    // submitted outcome payload + the game's configuration — never
    // accepted directly from the client. See gameType.schemas.js.
    score: { type: Number, default: 0, min: 0 }, // correct count, gameType-specific units
    scoreTotal: { type: Number, default: 0 }, // total possible, gameType-specific units
    ratio: { type: Number, min: 0, max: 1 }, // normalized 0..1 performance
    stars: { type: Number, min: 0, max: 5 },
    durationSeconds: { type: Number, min: 0 },
    xpEarned: { type: Number, default: 0, min: 0 },

    attempts: { type: Number, default: 1, min: 1 }, // reserved for in-session retry tracking
    outcome: { type: Schema.Types.Mixed }, // the raw payload the client submitted, kept for audit

    status: { type: String, enum: ["inProgress", "completed", "abandoned"], default: "inProgress" },

    isFirstCompletionForGame: { type: Boolean, default: false }, // set at completion time
  },
  { timestamps: true }
);

GameSessionSchema.index({ childProfile: 1, game: 1, createdAt: -1 });
GameSessionSchema.index({ childProfile: 1, status: 1 });
GameSessionSchema.index({ game: 1 });

module.exports = model("GameSession", GameSessionSchema);
