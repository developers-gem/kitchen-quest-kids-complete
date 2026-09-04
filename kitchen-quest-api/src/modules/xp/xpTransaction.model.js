const { Schema, model } = require("mongoose");

/**
 * Append-only ledger. ChildProfile.totalXP is a denormalized cache derived
 * from this collection — every XP-awarding code path (games today; recipes,
 * daily challenges, achievements later) inserts one of these *and then*
 * updates the cached total, never the other way around. This is what makes
 * "why did this child's XP change" answerable after the fact, and what a
 * future anti-abuse investigation would query first.
 */
const XPTransactionSchema = new Schema(
  {
    childProfile: { type: Schema.Types.ObjectId, ref: "ChildProfile", required: true, index: true },
    sourceType: {
      type: String,
      enum: ["game", "recipe", "dailyChallenge", "achievement", "lesson", "streak", "bonus"],
      required: true,
    },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 200 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

XPTransactionSchema.index({ childProfile: 1, createdAt: -1 });
XPTransactionSchema.index({ sourceType: 1, sourceId: 1 });

module.exports = model("XPTransaction", XPTransactionSchema);
