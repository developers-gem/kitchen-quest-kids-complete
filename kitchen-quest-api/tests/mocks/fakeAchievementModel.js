const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: { xpReward: 0, rarity: "common", status: "draft", version: 1 },
});
