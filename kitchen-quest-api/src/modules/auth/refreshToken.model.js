const { Schema, model } = require("mongoose");

/**
 * Refresh tokens are stored hashed (never plaintext) so a database leak
 * doesn't hand out usable tokens. Rotation: each successful /refresh call
 * revokes the presented token and issues a new one, linked via
 * replacedByTokenHash — which is also what lets us detect *reuse* of an
 * already-rotated token (a strong signal of theft) and respond by revoking
 * every token for that user.
 */
const RefreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
    userAgent: { type: String },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ user: 1, revokedAt: 1 });
// TTL index: Mongo automatically removes expired, already-useless documents.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("RefreshToken", RefreshTokenSchema);
