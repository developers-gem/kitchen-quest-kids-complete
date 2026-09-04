const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: {
    status: "inProgress",
    currentStepIndex: 0,
    completedStepIndices: [],
    xpEarned: 0,
    parentVerified: false,
  },
});
