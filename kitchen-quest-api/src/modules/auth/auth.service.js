const bcrypt = require("bcryptjs");
const User = require("../users/user.model");
const RefreshToken = require("./refreshToken.model");
const ConsentRecord = require("./consentRecord.model");
const familyService = require("../families/family.service");
const emailService = require("../../services/email.service");
const ApiError = require("../../utils/ApiError");
const env = require("../../config/env");
const {
  signAccessToken,
  generateRefreshTokenValue,
  hashToken,
  signPurposeToken,
  verifyPurposeToken,
} = require("../../utils/tokenUtils");

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_MS = Number(env.JWT_REFRESH_EXPIRES_IN_DAYS) * 24 * 60 * 60 * 1000;

function buildAccessTokenPayload(user, activeChildId = null) {
  return {
    sub: String(user._id),
    role: user.role,
    organizationId: String(user.organizationId),
    activeChildId,
  };
}

async function issueTokenPair(user, { userAgent } = {}) {
  const accessToken = signAccessToken(buildAccessTokenPayload(user));

  const rawRefreshToken = generateRefreshTokenValue();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    userAgent,
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

/**
 * Registration:
 * 1. Requires explicit consentAcknowledged=true (validated at the schema
 *    layer) before an account can be created at all.
 * 2. Creates the User, then the default family Organization, then links
 *    the two — order matters because Organization.primaryParent requires
 *    a userId.
 * 3. Records a ConsentRecord as an evidence trail (audit §K).
 * 4. Fires off (stubbed) email verification — registration does not block
 *    on email delivery succeeding.
 */
async function register({ firstName, lastName, email, password, familyName, timezone }, meta = {}) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Two-step create: User needs an organizationId, Organization needs a
  // primaryParent userId. Create the user first with a placeholder, then
  // create the org, then patch the user — all within a best-effort
  // sequence (a production system would wrap this in a Mongo transaction
  // if running as a replica set).
  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    timezone: timezone || "UTC",
    organizationId: undefined,
  });

  const organization = await familyService.createFamilyForNewUser({ userId: user._id, familyName });
  user.organizationId = organization._id;
  await user.save();

  await ConsentRecord.create({
    parentUserId: user._id,
    consentType: "account_creation",
    policyVersion: "v1",
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  const verificationToken = signPurposeToken({ sub: String(user._id), purpose: "email_verify" }, "24h");
  await emailService.sendVerificationEmail(user.email, verificationToken);

  const tokens = await issueTokenPair(user, { userAgent: meta.userAgent });
  return { user, organization, ...tokens };
}

async function login({ email, password }, meta = {}) {
  const user = await User.findOne({ email }).select("+passwordHash");
  // Deliberately generic error for both "no such user" and "wrong password"
  // to avoid leaking which emails are registered.
  if (!user || user.status !== "active" || !user.passwordHash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokenPair(user, { userAgent: meta.userAgent });
  return { user, ...tokens };
}

/**
 * Refresh token rotation with reuse detection:
 * - The presented token is hashed and looked up.
 * - If not found at all → invalid token, reject.
 * - If found but already revoked → this exact token was already rotated
 *   away once before; presenting it again means either a race condition
 *   or, more importantly, a stolen token being replayed. Treat as a
 *   compromise signal and revoke every refresh token for that user,
 *   forcing a full re-login on all devices.
 * - Otherwise: revoke the presented token, issue a new pair, link them.
 */
async function refresh(rawRefreshToken, meta = {}) {
  if (!rawRefreshToken) throw ApiError.unauthorized("Refresh token is required");

  const tokenHash = hashToken(rawRefreshToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  if (existing.revokedAt) {
    // Reuse of a rotated-away token — likely theft. Nuke all sessions.
    await RefreshToken.updateMany(
      { user: existing.user, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    throw ApiError.unauthorized("Refresh token has already been used; all sessions have been revoked for safety");
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized("Refresh token has expired");
  }

  const user = await User.findById(existing.user);
  if (!user || user.status !== "active") {
    throw ApiError.unauthorized("Account is not active");
  }

  const newRawToken = generateRefreshTokenValue();
  const newTokenHash = hashToken(newRawToken);

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newTokenHash;
  await existing.save();

  await RefreshToken.create({
    user: user._id,
    tokenHash: newTokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    userAgent: meta.userAgent,
  });

  const accessToken = signAccessToken(buildAccessTokenPayload(user));
  return { accessToken, refreshToken: newRawToken };
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

/** Always responds as if successful regardless of whether the email is
 * registered, to avoid leaking account existence (user enumeration). */
async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) return;
  const resetToken = signPurposeToken({ sub: String(user._id), purpose: "password_reset" }, "30m");
  await emailService.sendPasswordResetEmail(user.email, resetToken);
}

async function resetPassword(token, newPassword) {
  let payload;
  try {
    payload = verifyPurposeToken(token);
  } catch {
    throw ApiError.badRequest("Reset token is invalid or expired");
  }
  if (payload.purpose !== "password_reset") {
    throw ApiError.badRequest("Invalid token purpose");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.notFound("Account not found");

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  // Resetting a password invalidates every existing session — a standard
  // safety measure in case the reset was triggered by a compromise.
  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

async function verifyEmail(token) {
  let payload;
  try {
    payload = verifyPurposeToken(token);
  } catch {
    throw ApiError.badRequest("Verification token is invalid or expired");
  }
  if (payload.purpose !== "email_verify") {
    throw ApiError.badRequest("Invalid token purpose");
  }

  const user = await User.findByIdAndUpdate(payload.sub, { $set: { emailVerified: true } }, { new: true });
  if (!user) throw ApiError.notFound("Account not found");
  return user;
}

/**
 * Parental gate: a lightweight, stateless "is an adult holding this
 * device" challenge (basic arithmetic), standard in kids' apps. The
 * challenge answer is embedded in a short-lived signed token rather than
 * server-side session state, so no extra storage is needed for something
 * this low-stakes.
 */
function issueParentalGateChallenge() {
  const a = Math.floor(Math.random() * 8) + 2; // 2-9
  const b = Math.floor(Math.random() * 8) + 2;
  const challengeToken = signPurposeToken({ purpose: "parental_gate_challenge", answer: a * b }, "2m");
  return { question: `${a} x ${b}`, challengeToken };
}

function verifyParentalGateChallenge(user, { challengeToken, answer }) {
  let payload;
  try {
    payload = verifyPurposeToken(challengeToken);
  } catch {
    throw ApiError.badRequest("Challenge expired, please try again");
  }
  if (payload.purpose !== "parental_gate_challenge") {
    throw ApiError.badRequest("Invalid challenge token");
  }
  if (Number(answer) !== Number(payload.answer)) {
    throw ApiError.badRequest("That answer isn't quite right — try again");
  }
  const gateToken = signPurposeToken({ sub: String(user._id), purpose: "parental_gate" }, "15m");
  return { gateToken };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  issueParentalGateChallenge,
  verifyParentalGateChallenge,
};
