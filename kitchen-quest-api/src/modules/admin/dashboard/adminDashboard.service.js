const User = require("../../users/user.model");
const Organization = require("../../families/family.model");
const ChildProfile = require("../../children/childProfile.model");
const GameSession = require("../../games/gameSession.model");
const RecipeProgress = require("../../recipes/recipeProgress.model");
const Game = require("../../games/game.model");
const Recipe = require("../../recipes/recipe.model");

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const POPULAR_CONTENT_LIMIT = 5;

/**
 * All counts computed with plain find/countDocuments + in-application
 * reduction rather than a Mongo aggregation pipeline ($group, etc.) --
 * consistent with the rest of this codebase's choice to avoid operators
 * the in-memory test model doesn't implement, and entirely reasonable at
 * this platform's current data volume. If usage grows enough that this
 * becomes a real cost, swapping the "popular content" computation for a
 * real aggregation pipeline is a service-internal change, not an API
 * contract change.
 */
async function getOverview() {
  const [totalUsers, totalFamilies, totalChildProfiles, allChildren, gamesCompletedTotal, recipesCompletedTotal] =
    await Promise.all([
      User.countDocuments({ deletedAt: null }),
      Organization.countDocuments({ type: "family", deletedAt: null }),
      ChildProfile.countDocuments({ deletedAt: null }),
      ChildProfile.find({ deletedAt: null }),
      GameSession.countDocuments({ status: "completed" }),
      RecipeProgress.countDocuments({ status: "completed" }),
    ]);

  const now = Date.now();
  const activeChildProfiles = allChildren.filter(
    (c) => c.lastActivityDate && now - new Date(c.lastActivityDate).getTime() <= SEVEN_DAYS_MS
  ).length;

  const allUsers = await User.find({ deletedAt: null });
  const activeParentAccounts = allUsers.filter(
    (u) => u.lastLoginAt && now - new Date(u.lastLoginAt).getTime() <= THIRTY_DAYS_MS
  ).length;

  const popularContent = await getPopularContent();

  return {
    totalUsers,
    totalFamilies,
    totalChildProfiles,
    activeUsers: {
      childProfilesActiveLast7Days: activeChildProfiles,
      parentAccountsActiveLast30Days: activeParentAccounts,
    },
    gamesCompletedTotal,
    recipesCompletedTotal,
    popularContent,
  };
}

async function getPopularContent() {
  const [completedGameSessions, completedRecipeProgress] = await Promise.all([
    GameSession.find({ status: "completed" }),
    RecipeProgress.find({ status: "completed" }),
  ]);

  const gameCompletionCounts = new Map();
  completedGameSessions.forEach((s) => {
    const key = String(s.game);
    gameCompletionCounts.set(key, (gameCompletionCounts.get(key) || 0) + 1);
  });

  const recipeCompletionCounts = new Map();
  completedRecipeProgress.forEach((p) => {
    const key = String(p.recipe);
    recipeCompletionCounts.set(key, (recipeCompletionCounts.get(key) || 0) + 1);
  });

  const topGameIds = [...gameCompletionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, POPULAR_CONTENT_LIMIT)
    .map(([id]) => id);
  const topRecipeIds = [...recipeCompletionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, POPULAR_CONTENT_LIMIT)
    .map(([id]) => id);

  // FIXED (production readiness audit, findings C3/F3): this used to
  // issue N individual Model.findById() calls (via Promise.all over a
  // map) instead of one Model.find({_id: {$in: ids}}) query. Correct
  // either way at today's POPULAR_CONTENT_LIMIT of 5, but N queries
  // where one would do is exactly the pattern that gets copied into
  // future admin views and quietly becomes a real cost -- fixed here so
  // there's one correct example to copy from instead.
  const [games, recipes] = await Promise.all([
    Game.find({ _id: { $in: topGameIds } }),
    Recipe.find({ _id: { $in: topRecipeIds } }),
  ]);

  // $in does not guarantee results are ordered to match topGameIds/
  // topRecipeIds, so re-associate by id via a lookup map rather than by
  // array index (the previous index-based association was only safe
  // because findById calls preserved input order one-to-one).
  const gameById = new Map(games.map((g) => [String(g._id), g]));
  const recipeById = new Map(recipes.map((r) => [String(r._id), r]));

  return {
    topGames: topGameIds
      .map((id) => {
        const g = gameById.get(id);
        return g ? { _id: g._id, title: g.title, gameType: g.gameType, completions: gameCompletionCounts.get(id) } : null;
      })
      .filter(Boolean),
    topRecipes: topRecipeIds
      .map((id) => {
        const r = recipeById.get(id);
        return r ? { _id: r._id, title: r.title, completions: recipeCompletionCounts.get(id) } : null;
      })
      .filter(Boolean),
  };
}

module.exports = { getOverview };
