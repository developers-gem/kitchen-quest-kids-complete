const ApiError = require("../utils/ApiError");
const { verifyPurposeToken } = require("../utils/tokenUtils");

/**
 * Guards parent-only actions (adding/deleting a child, changing account
 * settings, viewing the parent dashboard) even inside an authenticated
 * session, so a child holding the device can't reach them without an
 * adult re-confirming via the parental gate challenge
 * (POST /auth/parental-gate/verify — see auth module).
 *
 * Expects an `x-parental-gate-token` header containing the short-lived
 * token issued by the gate-verification endpoint.
 */
function requireParentalGate() {
  return function (req, res, next) {
    try {
      const gateToken = req.headers["x-parental-gate-token"];
      if (!gateToken) {
        throw new ApiError(403, "PARENTAL_GATE_REQUIRED", "Parental gate verification required for this action");
      }
      let payload;
      try {
        payload = verifyPurposeToken(gateToken);
      } catch {
        throw new ApiError(403, "PARENTAL_GATE_REQUIRED", "Parental gate token is invalid or expired");
      }
      if (payload.purpose !== "parental_gate" || String(payload.sub) !== String(req.user._id)) {
        throw new ApiError(403, "PARENTAL_GATE_REQUIRED", "Parental gate token is invalid for this user");
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requireParentalGate;
