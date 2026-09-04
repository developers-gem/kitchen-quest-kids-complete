const AvatarCosmetic = require("../../avatars/avatarCosmetic.model");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");
const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const { createCosmeticSchema, updateCosmeticSchema } = require("./adminAvatarCosmetics.validation");

const service = createAdminContentService({
  Model: AvatarCosmetic,
  contentType: "AvatarCosmetic",
  searchField: "label",
  filterFields: ["slot"],
});

const controller = createAdminContentController(service);

module.exports = buildAdminContentRoutes({
  controller,
  createSchema: createCosmeticSchema,
  updateSchema: updateCosmeticSchema,
});
