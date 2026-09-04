const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["slug"],
  hiddenFields: [],
  defaults: {
    status: "draft",
    version: 1,
    difficulty: "easy",
    maxStars: 3,
    xpReward: 20,
    learningObjectives: [],
    nutritionTopics: [],
    foodTopics: [],
    unlockRequirements: { type: "always" },
  },
});
