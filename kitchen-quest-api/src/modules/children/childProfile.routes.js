const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireParentalGate = require("../../middleware/parentalGate");
const validateRequest = require("../../middleware/validateRequest");
const {
  createChildProfileSchema,
  updateChildProfileSchema,
  childIdParamSchema,
} = require("./childProfile.validation");
const controller = require("./childProfile.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/children — list this family's children (profile switcher UI)
router.get("/", controller.list);

// POST /api/v1/children — create a child profile (parental-gate-protected)
router.post("/", requireParentalGate(), validateRequest({ body: createChildProfileSchema }), controller.create);

// GET /api/v1/children/:id
router.get("/:id", validateRequest({ params: childIdParamSchema }), controller.getOne);

// PATCH /api/v1/children/:id (parental-gate-protected)
router.patch(
  "/:id",
  requireParentalGate(),
  validateRequest({ params: childIdParamSchema, body: updateChildProfileSchema }),
  controller.update
);

// DELETE /api/v1/children/:id (parental-gate-protected, irreversible-feeling action)
router.delete("/:id", requireParentalGate(), validateRequest({ params: childIdParamSchema }), controller.remove);

// POST /api/v1/children/:id/activate — switch active profile (no gate: this
// is the everyday "who's playing" action a parent hands off to a child).
router.post("/:id/activate", validateRequest({ params: childIdParamSchema }), controller.activate);

// GET /api/v1/children/:id/progress
router.get("/:id/progress", validateRequest({ params: childIdParamSchema }), controller.progress);

module.exports = router;
