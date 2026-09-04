const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["slug"],
  hiddenFields: [],
  defaults: {
    media: [],
    learningObjectives: [],
    xpReward: 15,
    status: "draft",
    version: 1,
  },
});
