const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const requireParentalGate = require("../../middleware/parentalGate");
const { updateProfileSchema } = require("./user.validation");
const controller = require("./user.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/users/me
router.get("/me", controller.getMe);

// PATCH /api/v1/users/me
router.patch("/me", validateRequest({ body: updateProfileSchema }), controller.updateMe);

// DELETE /api/v1/users/me — account erasure request; parental-gate-protected
// since it's an irreversible, high-stakes action.
router.delete("/me", requireParentalGate(), controller.deleteMe);

module.exports = router;
