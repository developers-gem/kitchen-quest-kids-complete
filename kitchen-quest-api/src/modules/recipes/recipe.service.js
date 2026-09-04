const Recipe = require("./recipe.model");
const RecipeProgress = require("./recipeProgress.model");
const groceryService = require("../grocery/grocery.service");
const ApiError = require("../../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../../utils/pagination");
const { getOwnedChild } = require("../../utils/getOwnedChild");
const { evaluateUnlockRule } = require("../../utils/unlockRuleEngine");
const { getFamilyTimezone } = require("../../utils/familyTimezone");
const { shapeRecipeSummary, shapeRecipeDetail, shapeStepForChild, stepCount } = require("./recipeModeShaper");
const { awardXp, recordActivity } = require("../gamification/gamification.service");
const { checkAndAwardAchievements } = require("../achievements/achievementEngine.service");
const { recordChallengeProgress } = require("../dailyChallenges/dailyChallenge.service");

/** Same replay-dampening idea as games: a first cook of a given recipe
 * earns full XP; re-cooking the same recipe still counts and still earns
 * something (practice is good!) but at a reduced rate, keeping the
 * incentive on trying new recipes. No daily cap here — unlike a tap-to-
 * play game, actually cooking something is naturally rate-limited by
 * real-world time and ingredients. */
const REPLAY_XP_RATIO = 0.3;



async function getPublishedRecipe(recipeId) {
  const recipe = await Recipe.findOne({ _id: recipeId, status: "published" });
  if (!recipe) throw ApiError.notFound("Recipe not found");
  return recipe;
}

async function isUnlockedForChild(recipe, child) {
  return evaluateUnlockRule(recipe.unlockRequirements, { child, GameSession: null });
}

async function listRecipes(query, { familyId } = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { status: "published" };
  if (query.ageRange) filter.ageGroups = query.ageRange;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.search) filter.title = { $regex: query.search, $options: "i" };
  if (query.maxTotalTimeMinutes) {
    filter.totalTimeMinutes = { $lte: Number(query.maxTotalTimeMinutes) };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Recipe.countDocuments(filter),
  ]);

  const allergensToExclude = query.allergenFree
    ? query.allergenFree.split(",").map((a) => a.trim().toLowerCase())
    : [];
  const filtered = allergensToExclude.length
    ? recipes.filter((r) => !r.allergenInformation.some((a) => allergensToExclude.includes(a.toLowerCase())))
    : recipes;

  let child = null;
  if (query.childId && familyId) {
    child = await getOwnedChild(query.childId, familyId).catch(() => null);
  }

  const data = await Promise.all(
    filtered.map(async (r) => {
      const base = shapeRecipeSummary(r);
      if (!child) return base;
      const completedCount = await RecipeProgress.countDocuments({
        child: child._id,
        recipe: r._id,
        status: "completed",
      });
      return {
        ...base,
        unlocked: await isUnlockedForChild(r, child),
        timesCompleted: completedCount,
      };
    })
  );

  return { data, meta: buildPaginationMeta({ page, limit, total }) };
}

async function getBySlug(slug, { mode = "parent", familyId, childId } = {}) {
  const recipe = await Recipe.findOne({ slug, status: "published" });
  if (!recipe) throw ApiError.notFound("Recipe not found");

  let unlockInfo = {};
  if (childId && familyId) {
    const child = await getOwnedChild(childId, familyId);
    unlockInfo = { unlocked: await isUnlockedForChild(recipe, child) };
  }

  return { ...shapeRecipeDetail(recipe, mode), ...unlockInfo };
}

/**
 * Starting to cook is idempotent in spirit: if the child already has an
 * inProgress or paused session for this recipe, that session is resumed
 * rather than a duplicate being created -- "start cooking" and "resume
 * cooking" are the same button from the child's point of view.
 */
async function startCooking(recipeId, childId, familyId) {
  const recipe = await getPublishedRecipe(recipeId);
  const child = await getOwnedChild(childId, familyId);

  const unlocked = await isUnlockedForChild(recipe, child);
  if (!unlocked) {
    throw new ApiError(403, "RECIPE_LOCKED", "This recipe hasn't been unlocked yet");
  }

  const existing = await RecipeProgress.find({ child: child._id, recipe: recipe._id });
  let progress = Array.isArray(existing) ? existing.find((p) => p.status !== "completed") : null;

  if (progress && progress.status === "paused") {
    progress.status = "inProgress";
    progress.pausedAt = null;
    await progress.save();
  } else if (!progress) {
    progress = await RecipeProgress.create({
      child: child._id,
      recipe: recipe._id,
      recipeVersion: recipe.version,
      status: "inProgress",
    });
    child.progressStats.recipesStarted += 1;
    await child.save();
  }

  // FIXED: previously this would crash with an out-of-bounds array
  // access if a child advanced through every step, then navigated away
  // WITHOUT completing or explicitly pausing (e.g. closed the tab on the
  // "ready to finish" screen). On return, `progress.status` is still
  // "inProgress" (not "paused"), so neither branch above touches it, and
  // `recipe.steps[progress.currentStepIndex]` was `recipe.steps[total]`
  // -- undefined -- which `shapeStepForChild` doesn't guard against.
  // Bounds-checked here the same way getCurrentStep already does, so
  // "resuming" a fully-stepped-through-but-not-completed session
  // correctly reports back at the completion prompt instead of crashing.
  const total = stepCount(recipe);
  const doneAllSteps = progress.currentStepIndex >= total;

  return {
    progress: {
      _id: progress._id,
      status: progress.status,
      currentStepIndex: progress.currentStepIndex,
    },
    recipe: shapeRecipeDetail(recipe, "child"),
    currentStep: doneAllSteps ? null : shapeStepForChild(recipe.steps[progress.currentStepIndex], progress.currentStepIndex, total),
    readyToComplete: doneAllSteps,
  };
}

async function getOwnedProgress(progressId, childId, familyId) {
  await getOwnedChild(childId, familyId);
  const progress = await RecipeProgress.findOne({ _id: progressId, child: childId });
  if (!progress) throw ApiError.notFound("Cooking session not found");
  return progress;
}

async function getCurrentStep(progressId, childId, familyId) {
  const progress = await getOwnedProgress(progressId, childId, familyId);
  const recipe = await Recipe.findById(progress.recipe);
  if (!recipe) throw ApiError.notFound("Recipe not found");

  const total = stepCount(recipe);
  const doneAllSteps = progress.currentStepIndex >= total;

  return {
    progress: { _id: progress._id, status: progress.status, currentStepIndex: progress.currentStepIndex },
    currentStep: doneAllSteps ? null : shapeStepForChild(recipe.steps[progress.currentStepIndex], progress.currentStepIndex, total),
    readyToComplete: doneAllSteps,
  };
}

/** Advances exactly one step. Bounded so it can never move past the last
 * step regardless of how many times a client calls it. */
async function advanceStep(progressId, childId, familyId) {
  const progress = await getOwnedProgress(progressId, childId, familyId);
  if (progress.status !== "inProgress") {
    throw ApiError.conflict(`Cannot advance a session that is ${progress.status}`);
  }
  const recipe = await Recipe.findById(progress.recipe);
  const total = stepCount(recipe);

  if (progress.currentStepIndex < total) {
    progress.completedStepIndices = [...new Set([...progress.completedStepIndices, progress.currentStepIndex])];
    progress.currentStepIndex = Math.min(progress.currentStepIndex + 1, total);
  }
  await progress.save();

  return getCurrentStep(progressId, childId, familyId);
}

async function pauseCooking(progressId, childId, familyId) {
  const progress = await getOwnedProgress(progressId, childId, familyId);
  if (progress.status !== "inProgress") {
    throw ApiError.conflict("Only an in-progress session can be paused");
  }
  progress.status = "paused";
  progress.pausedAt = new Date();
  await progress.save();
  return { _id: progress._id, status: progress.status };
}

async function resumeCooking(progressId, childId, familyId) {
  const progress = await getOwnedProgress(progressId, childId, familyId);
  if (progress.status !== "paused") {
    throw ApiError.conflict("Only a paused session can be resumed");
  }
  progress.status = "inProgress";
  progress.pausedAt = null;
  await progress.save();
  return getCurrentStep(progressId, childId, familyId);
}

/**
 * Completing requires every step to have been walked through
 * (currentStepIndex >= total) -- a child can't skip straight to the
 * reward screen by calling /complete without ever calling /advance. XP is
 * awarded immediately UNLESS the recipe requires parent verification, in
 * which case xpEarned stays 0 here and is granted at /verify instead.
 *
 * Streak/achievement/daily-challenge activity is recorded HERE, at
 * completion, regardless of whether XP is deferred -- the child actually
 * cooked something today; that's the activity, independent of whether a
 * parent has confirmed it yet for XP-award purposes. (See
 * gamification.service.js's `recordActivity` doc comment: "what counts as
 * activity" is completion, not payment.)
 */
async function completeCooking(progressId, childId, familyId) {
  const child = await getOwnedChild(childId, familyId);
  const progress = await RecipeProgress.findOne({ _id: progressId, child: childId });
  if (!progress) throw ApiError.notFound("Cooking session not found");
  if (progress.status === "completed") {
    throw ApiError.conflict("This cooking session has already been completed");
  }

  const recipe = await Recipe.findById(progress.recipe);
  const total = stepCount(recipe);
  if (progress.currentStepIndex < total) {
    throw ApiError.badRequest("All steps must be completed before finishing the recipe");
  }

  const priorCompletions = await RecipeProgress.countDocuments({
    child: child._id,
    recipe: recipe._id,
    status: "completed",
  });
  const isFirstCompletion = priorCompletions === 0;

  let xpEarned = 0;
  if (!recipe.requiresParentVerification) {
    xpEarned = isFirstCompletion ? recipe.xpReward : Math.round(recipe.xpReward * REPLAY_XP_RATIO);
  }

  progress.status = "completed";
  progress.completedAt = new Date();
  progress.xpEarned = xpEarned;
  await progress.save();

  if (xpEarned > 0) {
    await awardXp({
      child,
      sourceType: "recipe",
      sourceId: recipe._id,
      amount: xpEarned,
      reason: `Cooked ${recipe.title}${isFirstCompletion ? "" : " (again)"}`,
      metadata: { progressId: progress._id, isFirstCompletion },
    });
  }

  if (isFirstCompletion) {
    child.progressStats.recipesCompleted += 1;
    child.progressStats.foodsTried += 1;
  }

  const timezone = await getFamilyTimezone(familyId);
  await recordActivity(child, timezone);

  const challengeResult = await recordChallengeProgress(child, { eventType: "recipe", recipeId: recipe._id });
  const newlyEarnedAchievements = await checkAndAwardAchievements(child);
  await child.save();

  return {
    progress: {
      _id: progress._id,
      status: progress.status,
      xpEarned,
      isFirstCompletion,
      pendingParentVerification: recipe.requiresParentVerification,
    },
    newlyEarnedAchievements,
    dailyChallenge: challengeResult,
  };
}

/**
 * Parent verification -- idempotent (verifying twice doesn't double-pay).
 * Only pays out XP if it hasn't already been paid (i.e. the recipe
 * required verification and this is the first successful verify call).
 * Streak/daily-challenge activity was already recorded at completion
 * time (see completeCooking) -- verification only concerns the deferred
 * XP payout, and re-runs achievement checking since XP landing here could
 * push a level/XP-threshold achievement over the line.
 */
async function verifyCompletion(progressId, childId, familyId) {
  const child = await getOwnedChild(childId, familyId);
  const progress = await RecipeProgress.findOne({ _id: progressId, child: childId });
  if (!progress) throw ApiError.notFound("Cooking session not found");
  if (progress.status !== "completed") {
    throw ApiError.badRequest("Only a completed cooking session can be verified");
  }

  if (progress.parentVerified) {
    // FIXED (caught while building the web verification UI, which needs
    // a consistent response shape to render regardless of path): this
    // idempotent early-return used to omit `newlyEarnedAchievements`
    // entirely, while the "verifying for the first time" path below
    // always includes it (even as an empty array). A client checking
    // `res.newlyEarnedAchievements.length` would have thrown on the
    // idempotent path specifically -- the exact kind of bug that only
    // shows up when someone double-clicks "verify" or a request retries.
    return { progress: { _id: progress._id, parentVerified: true, xpEarned: progress.xpEarned }, newlyEarnedAchievements: [] };
  }

  const recipe = await Recipe.findById(progress.recipe);

  progress.parentVerified = true;
  progress.parentVerifiedAt = new Date();

  let xpEarned = progress.xpEarned;
  let newlyEarnedAchievements = [];
  if (recipe.requiresParentVerification && xpEarned === 0) {
    const priorVerifiedCompletions = await RecipeProgress.countDocuments({
      child: child._id,
      recipe: recipe._id,
      status: "completed",
      parentVerified: true,
    });
    const isFirstCompletion = priorVerifiedCompletions === 0;
    xpEarned = isFirstCompletion ? recipe.xpReward : Math.round(recipe.xpReward * REPLAY_XP_RATIO);
    progress.xpEarned = xpEarned;

    await awardXp({
      child,
      sourceType: "recipe",
      sourceId: recipe._id,
      amount: xpEarned,
      reason: `Cooked ${recipe.title}${isFirstCompletion ? "" : " (again)"} (parent-verified)`,
      metadata: { progressId: progress._id, isFirstCompletion },
    });

    if (isFirstCompletion) {
      child.progressStats.recipesCompleted += 1;
    }

    newlyEarnedAchievements = await checkAndAwardAchievements(child);
    await child.save();
  }

  await progress.save();

  return { progress: { _id: progress._id, parentVerified: true, xpEarned }, newlyEarnedAchievements };
}

async function addToGroceryList(recipeId, familyId) {
  const recipe = await getPublishedRecipe(recipeId);
  const list = await groceryService.addIngredientsFromRecipe(familyId, recipe);
  return list;
}

module.exports = {
  listRecipes,
  getBySlug,
  startCooking,
  getCurrentStep,
  advanceStep,
  pauseCooking,
  resumeCooking,
  completeCooking,
  verifyCompletion,
  addToGroceryList,
};
