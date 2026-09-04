const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: {
    type: "family",
    members: [],
    childProfiles: [],
    subscription: { plan: "free", status: "active" },
    settings: { contentRestrictionLevel: "standard", allowedAgeBands: ["4-6", "7-9", "10-12"] },
    deletedAt: null,
  },
});
