process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://unused-in-tests";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-real-use";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-real-use";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN_DAYS = "30";
process.env.CORS_ORIGIN = "http://localhost:5173";
// The auth/global rate limiters are shared for the lifetime of the app
// instance a test file creates, and a single test file legitimately makes
// far more than 20 auth calls across its cases. Raise the ceiling for
// tests only; production values stay conservative (see .env.example).
process.env.AUTH_RATE_LIMIT_MAX = "100000";
process.env.RATE_LIMIT_MAX = "100000";

/**
 * NOTE ON TEST STRATEGY:
 * This sandbox's egress network policy blocks fastdl.mongodb.org, which is
 * where `mongodb-memory-server` downloads its mongod binary from -- so a
 * real embedded MongoDB is not available here. Model files are remapped
 * (see jest.config.js `moduleNameMapper`) to small in-memory fakes that
 * implement the subset of the Mongoose query API this codebase uses
 * (find/findOne/findById/create/findOneAndUpdate/updateOne/updateMany/
 * countDocuments, plus doc.save()). This still exercises the full stack --
 * routes, middleware, validation, controllers, services -- end to end via
 * supertest; only the storage engine underneath is swapped out.
 *
 * In a real environment (local dev / CI / staging), run these same tests
 * against an actual MongoDB (Atlas, Docker, or a real mongodb-memory-server
 * where the binary download isn't blocked) for full confidence, including
 * Mongoose-level schema validation and index behavior the fakes don't
 * replicate.
 */
const fakeUserModel = require("./mocks/fakeUserModel");
const fakeOrganizationModel = require("./mocks/fakeOrganizationModel");
const fakeChildProfileModel = require("./mocks/fakeChildProfileModel");
const fakeRefreshTokenModel = require("./mocks/fakeRefreshTokenModel");
const fakeConsentRecordModel = require("./mocks/fakeConsentRecordModel");
const fakeGameModel = require("./mocks/fakeGameModel");
const fakeGameSessionModel = require("./mocks/fakeGameSessionModel");
const fakeRegionModel = require("./mocks/fakeRegionModel");
const fakeXPTransactionModel = require("./mocks/fakeXPTransactionModel");
const fakeRecipeModel = require("./mocks/fakeRecipeModel");
const fakeRecipeProgressModel = require("./mocks/fakeRecipeProgressModel");
const fakeGroceryListModel = require("./mocks/fakeGroceryListModel");
const fakeAvatarModel = require("./mocks/fakeAvatarModel");
const fakeAvatarCosmeticModel = require("./mocks/fakeAvatarCosmeticModel");
const fakeNutritionLessonModel = require("./mocks/fakeNutritionLessonModel");
const fakeFoodFactModel = require("./mocks/fakeFoodFactModel");
const fakeAchievementModel = require("./mocks/fakeAchievementModel");
const fakeChildAchievementModel = require("./mocks/fakeChildAchievementModel");
const fakeDailyChallengeModel = require("./mocks/fakeDailyChallengeModel");
const fakeChildChallengeProgressModel = require("./mocks/fakeChildChallengeProgressModel");
const fakeContentAuditLogModel = require("./mocks/fakeContentAuditLogModel");

const fakeModels = [
  fakeUserModel,
  fakeOrganizationModel,
  fakeChildProfileModel,
  fakeRefreshTokenModel,
  fakeConsentRecordModel,
  fakeGameModel,
  fakeGameSessionModel,
  fakeRegionModel,
  fakeXPTransactionModel,
  fakeRecipeModel,
  fakeRecipeProgressModel,
  fakeGroceryListModel,
  fakeAvatarModel,
  fakeAvatarCosmeticModel,
  fakeNutritionLessonModel,
  fakeFoodFactModel,
  fakeAchievementModel,
  fakeContentAuditLogModel,
  fakeChildAchievementModel,
  fakeDailyChallengeModel,
  fakeChildChallengeProgressModel,
];

afterEach(async () => {
  for (const m of fakeModels) {
    await m.deleteMany();
  }
});
