const { Router } = require("express");
const NutritionLesson = require("../../nutrition/nutritionLesson.model");
const FoodFact = require("../../nutrition/foodFact.model");
const { validateConfig } = require("../../games/gameType.schemas");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");
const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const ApiError = require("../../../utils/ApiError");
const {
  createLessonSchema,
  updateLessonSchema,
  createFoodFactSchema,
  updateFoodFactSchema,
} = require("./adminNutrition.validation");

// --- Nutrition lessons ------------------------------------------------
// The optional `quiz` field reuses the "quiz" gameType's config schema
// (see nutritionLesson.model.js's doc comment) -- validated here the same
// way adminGames.service.js validates a game's configuration, so a lesson
// can't be published with a check-for-understanding that wouldn't
// actually render/score correctly.
const baseLessonService = createAdminContentService({
  Model: NutritionLesson,
  contentType: "NutritionLesson",
  searchField: "title",
  filterFields: ["topic", "region"],
});

function validateQuizOrThrow(quiz) {
  if (!quiz) return;
  try {
    validateConfig("quiz", quiz);
  } catch (err) {
    throw ApiError.badRequest(`Invalid quiz configuration: ${err.message}`);
  }
}

const lessonService = {
  ...baseLessonService,
  create: (input, adminUser) => {
    validateQuizOrThrow(input.quiz);
    return baseLessonService.create(input, adminUser);
  },
  update: async (id, patch, adminUser) => {
    if (patch.quiz) validateQuizOrThrow(patch.quiz);
    return baseLessonService.update(id, patch, adminUser);
  },
};

const lessonController = createAdminContentController(lessonService);
const lessonRouter = buildAdminContentRoutes({
  controller: lessonController,
  createSchema: createLessonSchema,
  updateSchema: updateLessonSchema,
});

// --- Food facts ---------------------------------------------------------
const foodFactService = createAdminContentService({
  Model: FoodFact,
  contentType: "FoodFact",
  searchField: "foodName",
  filterFields: ["topic"],
});
const foodFactController = createAdminContentController(foodFactService);
const foodFactRouter = buildAdminContentRoutes({
  controller: foodFactController,
  createSchema: createFoodFactSchema,
  updateSchema: updateFoodFactSchema,
});

// --- Mount both under /admin/nutrition ----------------------------------
const router = Router();
router.use("/lessons", lessonRouter);
router.use("/food-facts", foodFactRouter);

module.exports = router;
