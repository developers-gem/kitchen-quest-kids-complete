const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const {
  listGamesQuerySchema,
  gameIdParamSchema,
  gameSlugParamSchema,
  startSessionBodySchema,
  saveProgressBodySchema,
  completeSessionBodySchema,
} = require("./game.validation");
const controller = require("./game.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/games?ageRange=&gameType=&difficulty=&search=&childId=&page=&limit=
router.get("/", validateRequest({ query: listGamesQuerySchema }), controller.list);

// GET /api/v1/games/:slug?childId=
router.get("/:slug", validateRequest({ params: gameSlugParamSchema }), controller.getBySlug);

// POST /api/v1/games/:id/start   { childId }
router.post(
  "/:id/start",
  validateRequest({ params: gameIdParamSchema, body: startSessionBodySchema }),
  controller.start
);

// POST /api/v1/games/:id/progress   { sessionId, childId, progress? }
router.post(
  "/:id/progress",
  validateRequest({ params: gameIdParamSchema, body: saveProgressBodySchema }),
  controller.progress
);

// POST /api/v1/games/:id/complete   { sessionId, childId, outcome, durationSeconds? }
router.post(
  "/:id/complete",
  validateRequest({ params: gameIdParamSchema, body: completeSessionBodySchema }),
  controller.complete
);

module.exports = router;
