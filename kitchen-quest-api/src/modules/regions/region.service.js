const Region = require("./region.model");
const Game = require("../games/game.model");
const GameSession = require("../games/gameSession.model");
const ApiError = require("../../utils/ApiError");
const { evaluateUnlockRule } = require("../../utils/unlockRuleEngine");
const { getOwnedChild } = require("../../utils/getOwnedChild");

/** Same unlock-rule engine games/recipes use -- Region unlock is data
 * (`unlockRequirements` on the document), evaluated centrally, never a
 * hardcoded boolean and never computed client-side. */
async function isUnlockedForChild(region, child) {
  return evaluateUnlockRule(region.unlockRequirements, { child, GameSession });
}

async function listRegions({ childId, familyId } = {}) {
  const regions = await Region.find({ status: "published" }).sort({ unlockOrder: 1 });

  let child = null;
  if (childId && familyId) {
    child = await getOwnedChild(childId, familyId).catch(() => null);
  }

  // FIXED (production readiness audit, finding C3/H2's sibling case):
  // this used to run one Game.countDocuments({region: r._id, ...}) call
  // per region inside the .map() below -- N separate round trips to
  // Mongo for a list of N regions. Replaced with a single query for all
  // published games' region field, counted per-region in application
  // code, so listing regions costs one Game query total regardless of
  // how many regions exist.
  const publishedGames = await Game.find({ status: "published" }, "region");
  const gameCountByRegion = new Map();
  publishedGames.forEach((g) => {
    if (!g.region) return;
    const key = String(g.region);
    gameCountByRegion.set(key, (gameCountByRegion.get(key) || 0) + 1);
  });

  return Promise.all(
    regions.map(async (r) => {
      const gameCount = gameCountByRegion.get(String(r._id)) || 0;
      const base = {
        _id: r._id,
        name: r.name,
        slug: r.slug,
        scopeType: r.scopeType,
        state: r.state,
        unlockOrder: r.unlockOrder,
        gameCount,
      };
      if (!child) return base;
      return { ...base, unlocked: await isUnlockedForChild(r, child) };
    })
  );
}

async function getRegionBySlug(slug, { childId, familyId } = {}) {
  const region = await Region.findOne({ slug, status: "published" });
  if (!region) throw ApiError.notFound("Region not found");

  const games = await Game.find({ region: region._id, status: "published" });

  let unlockInfo = {};
  if (childId && familyId) {
    const child = await getOwnedChild(childId, familyId);
    unlockInfo = { unlocked: await isUnlockedForChild(region, child) };
  }

  return {
    _id: region._id,
    name: region.name,
    slug: region.slug,
    scopeType: region.scopeType,
    state: region.state,
    unlockOrder: region.unlockOrder,
    games: games.map((g) => ({ _id: g._id, title: g.title, slug: g.slug, gameType: g.gameType })),
    ...unlockInfo,
  };
}

module.exports = { listRegions, getRegionBySlug };
