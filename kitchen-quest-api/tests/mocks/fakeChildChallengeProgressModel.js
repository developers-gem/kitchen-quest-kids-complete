const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: [],
  hiddenFields: [],
  defaults: { progress: 0, xpAwarded: 0 },
});
