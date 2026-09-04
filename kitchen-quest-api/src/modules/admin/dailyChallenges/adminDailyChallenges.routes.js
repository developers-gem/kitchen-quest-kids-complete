const DailyChallenge = require("../../dailyChallenges/dailyChallenge.model");
const { createAdminContentService } = require("../shared/adminContentServiceFactory");
const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const { createDailyChallengeSchema, updateDailyChallengeSchema } = require("./adminDailyChallenges.validation");

const service = createAdminContentService({
  Model: DailyChallenge,
  contentType: "DailyChallenge",
  searchField: "title",
  filterFields: ["challengeType"],
});

const controller = createAdminContentController(service);

module.exports = buildAdminContentRoutes({
  controller,
  createSchema: createDailyChallengeSchema,
  updateSchema: updateDailyChallengeSchema,
});
