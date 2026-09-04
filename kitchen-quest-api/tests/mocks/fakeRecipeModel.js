const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["slug"],
  hiddenFields: [],
  defaults: {
    status: "draft",
    version: 1,
    difficulty: "easy",
    gallery: [],
    cookingSkills: [],
    nutritionLearning: [],
    funFacts: [],
    learningObjectives: [],
    allergenInformation: [],
    xpReward: 40,
    supervisionRequired: true,
    knifeSafety: false,
    heatSafety: false,
    requiresParentVerification: true,
    unlockRequirements: { type: "always" },
  },
});
