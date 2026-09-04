const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const service = require("./adminGames.service");
const { createGameSchema, updateGameSchema } = require("./adminGames.validation");

const controller = createAdminContentController(service);

module.exports = buildAdminContentRoutes({
  controller,
  createSchema: createGameSchema,
  updateSchema: updateGameSchema,
});
