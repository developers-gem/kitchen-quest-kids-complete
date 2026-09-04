const { Schema, model } = require("mongoose");

const ChildChallengeProgressSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: "ChildProfile", required: true, index: true },
    challenge: { type: Schema.Types.ObjectId, ref: "DailyChallenge", required: true },
    progress: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date },
    xpAwarded: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChildChallengeProgressSchema.index({ child: 1, challenge: 1 }, { unique: true });

module.exports = model("ChildChallengeProgress", ChildChallengeProgressSchema);
