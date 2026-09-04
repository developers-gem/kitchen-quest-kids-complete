const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: {
    status: "inProgress",
    score: 0,
    scoreTotal: 0,
    xpEarned: 0,
    attempts: 1,
    isFirstCompletionForGame: false,
  },
});
