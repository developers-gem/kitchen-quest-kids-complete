const Region = require("../../regions/region.model");
const Game = require("../../games/game.model");
const Recipe = require("../../recipes/recipe.model");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");

const baseService = createAdminContentService({
  Model: Region,
  contentType: "Region",
  searchField: "name",
  filterFields: ["scopeType"],
});

/**
 * "Assign games/recipes" to a region is implemented as setting a game's
 * or recipe's own `region` field (via the admin games/recipes update
 * endpoint), not a separate join table -- both schemas already carry
 * that reference. This read helper is the convenience view an admin
 * actually needs: "what's currently assigned to this region," derived
 * from the two content collections rather than duplicated onto Region
 * itself (which would risk drifting out of sync with the real
 * game/recipe documents).
 */
async function getAssignedContent(regionId) {
  const [games, recipes] = await Promise.all([
    Game.find({ region: regionId }).select("title slug status gameType"),
    Recipe.find({ region: regionId }).select("title slug status difficulty"),
  ]);
  return { games, recipes };
}

module.exports = { ...baseService, getAssignedContent };
