const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const requireParentalGate = require("../../middleware/parentalGate");
const validateRequest = require("../../middleware/validateRequest");
const { updateFamilySchema } = require("./family.validation");
const controller = require("./family.controller");
const { ROLES } = require("../../config/constants");

const router = Router();

router.use(authenticate());

// GET /api/v1/families/me
router.get("/me", authorize(ROLES.PARENT, ROLES.PLATFORM_ADMIN), controller.getMyFamily);

// PATCH /api/v1/families/me — parent-only settings change, gated
router.patch(
  "/me",
  authorize(ROLES.PARENT, ROLES.PLATFORM_ADMIN),
  requireParentalGate(),
  validateRequest({ body: updateFamilySchema }),
  controller.updateMyFamily
);

module.exports = router;
