const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireParentalGate = require("../../middleware/parentalGate");
const validateRequest = require("../../middleware/validateRequest");
const {
  listRecipesQuerySchema,
  recipeSlugParamSchema,
  recipeIdParamSchema,
  progressIdParamSchema,
  detailQuerySchema,
  withChildIdBodySchema,
  withChildIdQuerySchema,
} = require("./recipe.validation");
const controller = require("./recipe.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/recipes?ageRange=&difficulty=&allergenFree=nuts,dairy&maxTotalTimeMinutes=&search=&childId=
router.get("/", validateRequest({ query: listRecipesQuerySchema }), controller.list);

// GET /api/v1/recipes/:slug?mode=child|parent&childId=
router.get(
  "/:slug",
  validateRequest({ params: recipeSlugParamSchema, query: detailQuerySchema }),
  controller.getBySlug
);

// POST /api/v1/recipes/:id/start   { childId }
router.post("/:id/start", validateRequest({ params: recipeIdParamSchema, body: withChildIdBodySchema }), controller.start);

// POST /api/v1/recipes/:id/add-to-grocery-list — parent-facing grocery integration
router.post("/:id/add-to-grocery-list", validateRequest({ params: recipeIdParamSchema }), controller.addToGroceryList);

// --- Cooking session (progress) sub-resource ---

// GET /api/v1/recipes/progress/:progressId?childId=   (child-mode one-step delivery)
router.get(
  "/progress/:progressId",
  validateRequest({ params: progressIdParamSchema, query: withChildIdQuerySchema }),
  controller.getCurrentStep
);

// POST /api/v1/recipes/progress/:progressId/advance   { childId }
router.post(
  "/progress/:progressId/advance",
  validateRequest({ params: progressIdParamSchema, body: withChildIdBodySchema }),
  controller.advance
);

// POST /api/v1/recipes/progress/:progressId/pause   { childId }
router.post(
  "/progress/:progressId/pause",
  validateRequest({ params: progressIdParamSchema, body: withChildIdBodySchema }),
  controller.pause
);

// POST /api/v1/recipes/progress/:progressId/resume   { childId }
router.post(
  "/progress/:progressId/resume",
  validateRequest({ params: progressIdParamSchema, body: withChildIdBodySchema }),
  controller.resume
);

// POST /api/v1/recipes/progress/:progressId/complete   { childId }
router.post(
  "/progress/:progressId/complete",
  validateRequest({ params: progressIdParamSchema, body: withChildIdBodySchema }),
  controller.complete
);

// POST /api/v1/recipes/progress/:progressId/verify   { childId } — parent-only, gated
router.post(
  "/progress/:progressId/verify",
  requireParentalGate(),
  validateRequest({ params: progressIdParamSchema, body: withChildIdBodySchema }),
  controller.verify
);

module.exports = router;
