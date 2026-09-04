const Recipe = require("../../recipes/recipe.model");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");
const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const { createRecipeSchema, updateRecipeSchema } = require("./adminRecipes.validation");

/**
 * No recipe-specific override needed on top of the generic factory --
 * ingredients/steps are validated by adminRecipes.validation.js's zod
 * schema at the HTTP boundary, which is sufficient (unlike games, there's
 * no further gameType-style polymorphic shape to re-check server-side).
 */
const service = createAdminContentService({
  Model: Recipe,
  contentType: "Recipe",
  searchField: "title",
  filterFields: ["difficulty", "region"],
});

const controller = createAdminContentController(service);

module.exports = buildAdminContentRoutes({
  controller,
  createSchema: createRecipeSchema,
  updateSchema: updateRecipeSchema,
});
