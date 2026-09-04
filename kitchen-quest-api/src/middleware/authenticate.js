const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/tokenUtils");
const User = require("../modules/users/user.model");

/**
 * Verifies the JWT access token from the Authorization header and attaches
 * req.user (the authenticated parent/admin/etc.) and, if present in the
 * token payload, req.activeChildId (the currently-selected child profile —
 * see the auth architecture's "parental gate" / session-context design).
 *
 * Child profiles never hold their own credential; a child is always acting
 * inside a parent's authenticated session.
 */
function authenticate() {
  return async function (req, res, next) {
    try {
      const header = req.headers.authorization || "";
      const [scheme, token] = header.split(" ");

      if (scheme !== "Bearer" || !token) {
        throw ApiError.unauthorized("Missing or malformed Authorization header");
      }

      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (err) {
        throw ApiError.unauthorized("Invalid or expired access token");
      }

      const user = await User.findById(payload.sub).select("+status");
      if (!user || user.status !== "active") {
        throw ApiError.unauthorized("Account is not active");
      }

      req.user = user;
      req.activeChildId = payload.activeChildId || null;
      req.tokenPayload = payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authenticate;
