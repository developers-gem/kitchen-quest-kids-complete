const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: ["preferences.allergies"],
  defaults: {
    currentLevel: 1,
    totalXP: 0,
    badges: [],
    unlockedRegions: [],
    progressStats: {
      gamesPlayed: 0,
      gamesCompleted: 0,
      recipesStarted: 0,
      recipesCompleted: 0,
      foodsTried: 0,
      nutritionQuestsCompleted: 0,
    },
    currentStreak: 0,
    longestStreak: 0,
    dailyChallengeProgress: { progress: 0 },
    preferences: {
      favoriteFoods: [],
      dislikedFoods: [],
      dietaryPreferences: [],
      allergies: [],
      accessibilityPreferences: {
        reducedMotion: false,
        largeText: false,
        audioNarration: false,
        captions: false,
      },
    },
    deletedAt: null,
  },
});
