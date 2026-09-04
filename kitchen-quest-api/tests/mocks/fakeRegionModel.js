const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["slug"],
  hiddenFields: [],
  defaults: {
    scopeType: "usState",
    featuredFoods: [],
    unlockRequirements: { type: "always" },
    status: "draft",
    version: 1,
  },
});
