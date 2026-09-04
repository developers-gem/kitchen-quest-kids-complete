const GameSession = require("../modules/games/gameSession.model");
const Game = require("../modules/games/game.model");
const RecipeProgress = require("../modules/recipes/recipeProgress.model");

/**
 * ONE central rule engine, used for every kind of "should this child see
 * this as unlocked" question in the system: games, recipes, regions,
 * avatar cosmetics, AND achievement criteria (achievementEngine.service.js
 * calls this exact function rather than maintaining a second, overlapping
 * rule evaluator). Rules are stored as data on the content document
 * (Game.unlockRequirements, Region.unlockRequirements,
 * Achievement.unlockCriteria, an avatar cosmetic's unlockCriteria, ...)
 * and evaluated here, centrally, server-side -- never client-side, and
 * never as a hardcoded `locked: true/false` per item. Adding a new rule
 * *type* means adding one case here, not touching every piece of content
 * that might one day want it.
 *
 * Supported rule shapes:
 *   { type: "always" }
 *   { type: "levelAtLeast", value }
 *   { type: "gameCompleted", gameId }
 *   { type: "gameStarsAtLeast", gameId, stars }
 *   { type: "recipeCompleted", recipeId }
 *   { type: "gamesCompletedAtLeast", value }        -- distinct games completed at least once
 *   { type: "recipesCompletedAtLeast", value }
 *   { type: "firstGame" }                            -- sugar for gamesCompletedAtLeast: 1
 *   { type: "firstRecipe" }                          -- sugar for recipesCompletedAtLeast: 1
 *   { type: "foodsExploredAtLeast", value }
 *   { type: "streakAtLeast", value }                  -- current streak
 *   { type: "longestStreakAtLeast", value }
 *   { type: "nutritionQuestsCompletedAtLeast", value } -- distinct nutrition
 *       lessons completed, tracked via NutritionLesson.service.js's
 *       completeLesson (which increments progressStats.nutritionQuestsCompleted
 *       on first completion, same pattern as gamesCompleted/recipesCompleted)
 *   { type: "regionsExploredAtLeast", value }         -- distinct regions with >=1 completed game
 *   { type: "allOf", rules: [...] }
 *   { type: "anyOf", rules: [...] }
 */
async function evaluateUnlockRule(rule, ctx) {
  if (!rule || rule.type === "always") return true;

  const child = ctx.child;

  switch (rule.type) {
    case "levelAtLeast":
      return child.currentLevel >= rule.value;

    case "streakAtLeast":
      return child.currentStreak >= rule.value;

    case "longestStreakAtLeast":
      return child.longestStreak >= rule.value;

    case "foodsExploredAtLeast":
      return child.progressStats.foodsTried >= rule.value;

    case "nutritionQuestsCompletedAtLeast":
      return child.progressStats.nutritionQuestsCompleted >= rule.value;

    case "gamesCompletedAtLeast":
      return child.progressStats.gamesCompleted >= rule.value;

    case "recipesCompletedAtLeast":
      return child.progressStats.recipesCompleted >= rule.value;

    case "firstGame":
      return child.progressStats.gamesCompleted >= 1;

    case "firstRecipe":
      return child.progressStats.recipesCompleted >= 1;

    case "gameCompleted": {
      const gameSessionModel = ctx.GameSession || GameSession;
      const count = await gameSessionModel.countDocuments({
        childProfile: child._id,
        game: rule.gameId,
        status: "completed",
      });
      return count > 0;
    }

    case "recipeCompleted": {
      const recipeProgressModel = ctx.RecipeProgress || RecipeProgress;
      const count = await recipeProgressModel.countDocuments({
        child: child._id,
        recipe: rule.recipeId,
        status: "completed",
      });
      return count > 0;
    }

    case "gameStarsAtLeast": {
      const gameSessionModel = ctx.GameSession || GameSession;
      const sessions = await gameSessionModel.find({
        childProfile: child._id,
        game: rule.gameId,
        status: "completed",
      });
      const bestStars = Array.isArray(sessions) ? sessions.reduce((max, s) => Math.max(max, s.stars || 0), 0) : 0;
      return bestStars >= rule.stars;
    }

    case "regionsExploredAtLeast": {
      const gameSessionModel = ctx.GameSession || GameSession;
      const gameModel = ctx.Game || Game;
      const sessions = await gameSessionModel.find({ childProfile: child._id, status: "completed" });
      const gameIds = [...new Set((Array.isArray(sessions) ? sessions : []).map((s) => String(s.game)))];
      const games = await Promise.all(gameIds.map((id) => gameModel.findById(id)));
      const regionKeys = new Set(
        games.filter(Boolean).map((g) => (g.region ? String(g.region) : g.state)).filter(Boolean)
      );
      return regionKeys.size >= rule.value;
    }

    case "allOf":
      for (const sub of rule.rules) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await evaluateUnlockRule(sub, ctx))) return false;
      }
      return true;

    case "anyOf": {
      const results = await Promise.all(rule.rules.map((sub) => evaluateUnlockRule(sub, ctx)));
      return results.some(Boolean);
    }

    default:
      // Unknown rule types fail closed (locked) rather than silently
      // unlocking content an admin didn't intend to ship yet.
      return false;
  }
}

module.exports = { evaluateUnlockRule };
