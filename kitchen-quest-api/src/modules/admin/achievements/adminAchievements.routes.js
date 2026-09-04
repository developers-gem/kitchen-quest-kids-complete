const Achievement = require("../../achievements/achievement.model");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");
const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const { createAchievementSchema, updateAchievementSchema } = require("./adminAchievements.validation");

const service = createAdminContentService({
  Model: Achievement,
  contentType: "Achievement",
  searchField: "title",
  filterFields: ["category", "rarity"],
});

const controller = createAdminContentController(service);

module.exports = buildAdminContentRoutes({
  controller,
  createSchema: createAchievementSchema,
  updateSchema: updateAchievementSchema,
});
