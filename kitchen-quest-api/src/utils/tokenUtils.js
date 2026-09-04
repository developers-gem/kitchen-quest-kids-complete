const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

/** Short-lived access token — carries identity + roles + optional active child context. */
function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/** Refresh tokens are opaque random strings, not JWTs — they're looked up
 * (hashed) in the RefreshToken collection, which is what makes server-side
 * revocation and rotation-reuse detection possible. */
function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Signed, time-limited tokens for email verification / password reset links. */
function signPurposeToken(payload, expiresIn) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn });
}

function verifyPurposeToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshTokenValue,
  hashToken,
  signPurposeToken,
  verifyPurposeToken,
};
