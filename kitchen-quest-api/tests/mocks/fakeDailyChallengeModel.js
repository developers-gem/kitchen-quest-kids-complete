const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: { xpReward: 25, status: "draft", version: 1 },
});
