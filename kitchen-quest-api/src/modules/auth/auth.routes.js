const { Router } = require("express");
const validateRequest = require("../../middleware/validateRequest");
const authenticate = require("../../middleware/authenticate");
const { authLimiter } = require("../../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  parentalGateVerifySchema,
} = require("./auth.validation");
const controller = require("./auth.controller");

const router = Router();

router.use(authLimiter);

router.post("/register", validateRequest({ body: registerSchema }), controller.register);
router.post("/login", validateRequest({ body: loginSchema }), controller.login);
router.post("/refresh", validateRequest({ body: refreshSchema }), controller.refresh);
router.post("/logout", controller.logout);
router.post("/forgot-password", validateRequest({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post("/reset-password", validateRequest({ body: resetPasswordSchema }), controller.resetPassword);
router.get("/verify-email", controller.verifyEmail); // convenience GET for email links
router.post("/verify-email", validateRequest({ body: verifyEmailSchema }), controller.verifyEmail);

// Parental gate: challenge is public-shaped but still requires an
// authenticated parent session (you must already be logged in — this
// isn't a second login, it's a "prove an adult is present right now"
// re-check).
router.post("/parental-gate/challenge", authenticate(), controller.parentalGateChallenge);
router.post(
  "/parental-gate/verify",
  authenticate(),
  validateRequest({ body: parentalGateVerifySchema }),
  controller.parentalGateVerify
);

module.exports = router;
