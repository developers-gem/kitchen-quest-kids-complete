const Game = require("../../games/game.model");
const { validateConfig } = require("../../games/gameType.schemas");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");
const ApiError = require("../../../utils/ApiError");

const baseService = createAdminContentService({
  Model: Game,
  contentType: "Game",
  searchField: "title",
  filterFields: ["gameType", "region", "difficulty"],
});

/**
 * The one thing genuinely specific to games among the generic CRUD/
 * workflow operations: `configuration`'s shape depends on `gameType`
 * (per the mini-game framework's config-driven design), so admin
 * create/update re-validates it against that gameType's own zod schema
 * from gameType.schemas.js -- the exact same schema the child-facing
 * game session flow trusts. An admin can never publish a game whose
 * configuration wouldn't actually work at play time.
 */
function validateConfigurationOrThrow(gameType, configuration) {
  try {
    validateConfig(gameType, configuration);
  } catch (err) {
    throw ApiError.badRequest(`Invalid configuration for gameType "${gameType}": ${err.message}`);
  }
}

async function create(input, adminUser) {
  validateConfigurationOrThrow(input.gameType, input.configuration);
  return baseService.create(input, adminUser);
}

async function update(id, patch, adminUser) {
  if (patch.configuration || patch.gameType) {
    const existing = await baseService.getById(id);
    const gameType = patch.gameType || existing.gameType;
    const configuration = patch.configuration || existing.configuration;
    validateConfigurationOrThrow(gameType, configuration);
  }
  return baseService.update(id, patch, adminUser);
}

/**
 * Publishing specifically (not review/archive/etc.) re-validates the
 * configuration one more time as a final safety net, in case the
 * document was ever mutated outside this service (a direct DB edit, a
 * data migration) since it was last saved through `create`/`update`.
 */
async function transitionStatus(id, toStatus, adminUser) {
  if (toStatus === "published") {
    const existing = await baseService.getById(id);
    validateConfigurationOrThrow(existing.gameType, existing.configuration);
  }
  return baseService.transitionStatus(id, toStatus, adminUser);
}

module.exports = {
  ...baseService,
  create,
  update,
  transitionStatus,
};
