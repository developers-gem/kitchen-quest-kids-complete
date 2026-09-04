const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireParentalGate = require("../../middleware/parentalGate");
const validateRequest = require("../../middleware/validateRequest");
const { withChildIdQuerySchema, activityHistoryQuerySchema } = require("./dashboard.validation");
const controller = require("./dashboard.controller");

const router = Router();

router.use(authenticate());
// Every dashboard screen is a parent-only surface, per the audit's data
// minimization/child-safety requirements -- gated behind the parental
// gate as a whole, not per-endpoint, since a parent viewing their own
// dashboard is exactly the scenario the gate exists to protect from a
// child who has picked up the device.
router.use(requireParentalGate());

// GET /api/v1/parent-dashboard/overview?childId=
router.get("/overview", validateRequest({ query: withChildIdQuerySchema }), controller.overview);

// GET /api/v1/parent-dashboard/weekly-summary?childId=
router.get("/weekly-summary", validateRequest({ query: withChildIdQuerySchema }), controller.weeklySummary);

// GET /api/v1/parent-dashboard/learning-progress?childId=
router.get("/learning-progress", validateRequest({ query: withChildIdQuerySchema }), controller.learningProgress);

// GET /api/v1/parent-dashboard/activity-history?childId=&page=&limit=
router.get("/activity-history", validateRequest({ query: activityHistoryQuerySchema }), controller.activityHistory);

// GET /api/v1/parent-dashboard/grocery
router.get("/grocery", controller.grocery);

// GET /api/v1/parent-dashboard/settings
router.get("/settings", controller.settings);

module.exports = router;
