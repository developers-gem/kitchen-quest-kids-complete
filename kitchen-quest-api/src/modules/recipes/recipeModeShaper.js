/**
 * ============================================================================
 * ONE CONTENT MODEL, TWO EXPERIENCES
 * ============================================================================
 * There is exactly one `Recipe` document per recipe — parent-mode and
 * child-mode are response *shapes* derived from it, computed here, never
 * two separate content records an admin would have to keep in sync.
 *
 * PARENT MODE: everything — exact measurements/units, full ingredient list
 * with allergens, every safety detail, all steps up front, grocery
 * integration data. A parent making a shopping decision needs precision.
 *
 * CHILD MODE: encouragement over precision. No measurements/units (a
 * grown-up already bought the ingredients — the child just needs to know
 * *what*, shown with a picture). Steps are delivered ONE AT A TIME (via a
 * separate endpoint, not embedded in this response) using
 * `simpleInstruction` where authored. Safety detail is reduced to a short
 * "ask a grown-up" flag rather than a paragraph. Fun facts and cooking
 * skills stay — they're the motivating, kid-facing content.
 * ============================================================================
 */

function stepCount(recipe) {
  return recipe.steps.length;
}

function shapeIngredientForChild(ingredient) {
  // No quantity/unit/substitutes — that's a shopping/prep concern, not a
  // "what am I adding" concern for the child actually cooking.
  return { name: ingredient.name, category: ingredient.category };
}

function shapeStepForChild(step, index, total) {
  return {
    stepNumber: index + 1,
    totalSteps: total,
    title: step.title,
    instruction: step.simpleInstruction || step.instruction,
    image: step.image,
    video: step.video,
    audioNarration: step.audioNarration,
    needsGrownUp: step.parentAssistanceRequired || step.safetyLevel !== "none",
  };
}

function shapeRecipeSummary(recipe) {
  // Used by list endpoints — identical fields regardless of mode, since
  // browsing a recipe list is itself a parent-facing action in this app
  // (kids pick from what a parent has already queued up).
  return {
    _id: recipe._id,
    title: recipe.title,
    slug: recipe.slug,
    shortDescription: recipe.shortDescription,
    coverImage: recipe.coverImage,
    difficulty: recipe.difficulty,
    preparationTimeMinutes: recipe.preparationTimeMinutes,
    cookingTimeMinutes: recipe.cookingTimeMinutes,
    totalTimeMinutes: recipe.totalTimeMinutes,
    stepCount: stepCount(recipe),
    ageGroups: recipe.ageGroups,
    allergenInformation: recipe.allergenInformation,
    xpReward: recipe.xpReward,
  };
}

function shapeRecipeDetail(recipe, mode) {
  const base = {
    _id: recipe._id,
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description,
    coverImage: recipe.coverImage,
    gallery: recipe.gallery,
    difficulty: recipe.difficulty,
    totalTimeMinutes: recipe.totalTimeMinutes,
    stepCount: stepCount(recipe),
    ageGroups: recipe.ageGroups,
    cookingSkills: recipe.cookingSkills,
    funFacts: recipe.funFacts,
    xpReward: recipe.xpReward,
  };

  if (mode === "child") {
    return {
      ...base,
      ingredients: recipe.ingredients.map(shapeIngredientForChild),
      // No `steps` here at all in child mode — delivered one at a time via
      // GET /recipes/progress/:progressId (the "current step" endpoint).
      needsGrownUpHelp: recipe.supervisionRequired,
    };
  }

  // Parent mode: everything.
  return {
    ...base,
    shortDescription: recipe.shortDescription,
    preparationTimeMinutes: recipe.preparationTimeMinutes,
    cookingTimeMinutes: recipe.cookingTimeMinutes,
    cuisine: recipe.cuisine,
    nutritionLearning: recipe.nutritionLearning,
    learningObjectives: recipe.learningObjectives,
    ingredients: recipe.ingredients, // full: quantity, unit, category, optional, substitutes
    steps: recipe.steps, // full parent-mode instruction text, all steps up front
    supervisionRequired: recipe.supervisionRequired,
    knifeSafety: recipe.knifeSafety,
    heatSafety: recipe.heatSafety,
    allergenInformation: recipe.allergenInformation,
    requiresParentVerification: recipe.requiresParentVerification,
  };
}

module.exports = { shapeRecipeSummary, shapeRecipeDetail, shapeStepForChild, stepCount };
