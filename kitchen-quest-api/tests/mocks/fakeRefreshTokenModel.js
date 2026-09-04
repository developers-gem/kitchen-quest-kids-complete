const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["tokenHash"],
  hiddenFields: [],
  defaults: {
    revokedAt: null,
    replacedByTokenHash: null,
  },
});
