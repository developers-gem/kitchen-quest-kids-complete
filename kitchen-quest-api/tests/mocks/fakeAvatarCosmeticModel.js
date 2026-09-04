const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: { unlockRequirements: { type: "always" }, status: "draft", version: 1 },
});
