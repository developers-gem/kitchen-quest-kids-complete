const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["characterId"],
  hiddenFields: [],
  defaults: { avatarType: "emoji", accessories: [], unlockedCosmetics: [], isSystemDefault: true, active: true },
});
