const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const { listQuerySchema, slugParamSchema, idParamSchema, completeBodySchema } = require("./nutritionLesson.validation");
const controller = require("./nutritionLesson.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/nutrition-lessons?ageRange=&topic=&childId=
router.get("/", validateRequest({ query: listQuerySchema }), controller.list);

// GET /api/v1/nutrition-lessons/:slug
router.get("/:slug", validateRequest({ params: slugParamSchema }), controller.getBySlug);

// POST /api/v1/nutrition-lessons/:id/complete   { childId, answers? }
router.post(
  "/:id/complete",
  validateRequest({ params: idParamSchema, body: completeBodySchema }),
  controller.complete
);

module.exports = router;
