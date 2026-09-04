const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const authService = require("./auth.service");
const env = require("../../config/env");

const REFRESH_COOKIE_NAME = "kqk_refresh_token";
const REFRESH_COOKIE_MAX_AGE_MS = Number(env.JWT_REFRESH_EXPIRES_IN_DAYS) * 24 * 60 * 60 * 1000;

/**
 * The refresh token is set as an httpOnly, secure cookie for the web
 * client (immune to JS-based XSS token theft) AND returned in the JSON
 * body, since a Flutter client has no shared cookie jar and instead
 * stores it in `flutter_secure_storage`. Both clients speak the same API;
 * only the storage mechanism differs by platform (see architecture §6).
 */
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: "/api/v1/auth",
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
}

function extractRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken || null;
}

const register = asyncHandler(async (req, res) => {
  const meta = { ip: req.ip, userAgent: req.headers["user-agent"] };
  const { user, organization, accessToken, refreshToken } = await authService.register(req.body, meta);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, {
    statusCode: 201,
    data: { user, organization, accessToken, refreshToken },
    message: "Account created. Please check your email to verify your address.",
  });
});

const login = asyncHandler(async (req, res) => {
  const meta = { userAgent: req.headers["user-agent"] };
  const { user, accessToken, refreshToken } = await authService.login(req.body, meta);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { data: { user, accessToken, refreshToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const presented = extractRefreshToken(req);
  const { accessToken, refreshToken } = await authService.refresh(presented, {
    userAgent: req.headers["user-agent"],
  });
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { data: { accessToken, refreshToken } });
});

const logout = asyncHandler(async (req, res) => {
  const presented = extractRefreshToken(req);
  await authService.logout(presented);
  clearRefreshCookie(res);
  sendSuccess(res, { message: "Logged out" });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: "If that email exists, a password reset link has been sent" });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, { message: "Password has been reset. Please log in again." });
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token || req.query.token);
  sendSuccess(res, { message: "Email verified" });
});

const parentalGateChallenge = asyncHandler(async (req, res) => {
  const challenge = authService.issueParentalGateChallenge();
  sendSuccess(res, { data: challenge });
});

const parentalGateVerify = asyncHandler(async (req, res) => {
  const result = authService.verifyParentalGateChallenge(req.user, req.body);
  sendSuccess(res, { data: result });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  parentalGateChallenge,
  parentalGateVerify,
};
