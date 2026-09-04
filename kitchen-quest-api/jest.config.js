module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 20000,
  verbose: true,
  // See tests/setup.js for why: this sandbox can't download a real mongod
  // binary, so model files are swapped for in-memory fakes during tests.
  // Matched by filename (not full path) since internal requires inside
  // each module use relative specifiers of varying depth, and
  // moduleNameMapper matches the raw specifier string, not the resolved
  // absolute path.
  moduleNameMapper: {
    "user\\.model$": "<rootDir>/tests/mocks/fakeUserModel.js",
    "family\\.model$": "<rootDir>/tests/mocks/fakeOrganizationModel.js",
    "childProfile\\.model$": "<rootDir>/tests/mocks/fakeChildProfileModel.js",
    "refreshToken\\.model$": "<rootDir>/tests/mocks/fakeRefreshTokenModel.js",
    "consentRecord\\.model$": "<rootDir>/tests/mocks/fakeConsentRecordModel.js",
    "gameSession\\.model$": "<rootDir>/tests/mocks/fakeGameSessionModel.js",
    "game\\.model$": "<rootDir>/tests/mocks/fakeGameModel.js",
    "region\\.model$": "<rootDir>/tests/mocks/fakeRegionModel.js",
    "xpTransaction\\.model$": "<rootDir>/tests/mocks/fakeXPTransactionModel.js",
    "recipeProgress\\.model$": "<rootDir>/tests/mocks/fakeRecipeProgressModel.js",
    "recipe\\.model$": "<rootDir>/tests/mocks/fakeRecipeModel.js",
    "groceryList\\.model$": "<rootDir>/tests/mocks/fakeGroceryListModel.js",
    "nutritionLesson\\.model$": "<rootDir>/tests/mocks/fakeNutritionLessonModel.js",
    "foodFact\\.model$": "<rootDir>/tests/mocks/fakeFoodFactModel.js",
    "achievement\\.model$": "<rootDir>/tests/mocks/fakeAchievementModel.js",
    "childAchievement\\.model$": "<rootDir>/tests/mocks/fakeChildAchievementModel.js",
    "dailyChallenge\\.model$": "<rootDir>/tests/mocks/fakeDailyChallengeModel.js",
    "childChallengeProgress\\.model$": "<rootDir>/tests/mocks/fakeChildChallengeProgressModel.js",
    "contentAuditLog\\.model$": "<rootDir>/tests/mocks/fakeContentAuditLogModel.js",
    "avatar\\.model$": "<rootDir>/tests/mocks/fakeAvatarModel.js",
    "avatarCosmetic\\.model$": "<rootDir>/tests/mocks/fakeAvatarCosmeticModel.js",
  },
};
