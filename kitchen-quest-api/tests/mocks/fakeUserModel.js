const { createInMemoryModel } = require("./inMemoryModel");

module.exports = createInMemoryModel({
  uniqueFields: ["email"],
  hiddenFields: ["passwordHash", "authProviderId"],
  defaults: {
    role: ["parent"],
    authProvider: "password",
    emailVerified: false,
    status: "active",
    timezone: "UTC",
    locale: "en-US",
    notificationPreferences: [],
    deletedAt: null,
  },
  toJSON: (obj) => {
    const clone = { ...obj };
    delete clone.passwordHash;
    delete clone.authProviderId;
    delete clone.__v;
    return clone;
  },
});
