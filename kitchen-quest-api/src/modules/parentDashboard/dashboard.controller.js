const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const dashboardService = require("./dashboard.service");

const overview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOverview(req.query.childId, req.user.organizationId);
  sendSuccess(res, { data });
});

const weeklySummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getWeeklySummary(req.query.childId, req.user.organizationId);
  sendSuccess(res, { data });
});

const learningProgress = asyncHandler(async (req, res) => {
  const data = await dashboardService.getLearningProgress(req.query.childId, req.user.organizationId);
  sendSuccess(res, { data });
});

const activityHistory = asyncHandler(async (req, res) => {
  const { data, meta } = await dashboardService.getActivityHistory(req.query.childId, req.user.organizationId, req.query);
  sendSuccess(res, { data, meta });
});

const grocery = asyncHandler(async (req, res) => {
  const data = await dashboardService.getGroceryOverview(req.user.organizationId);
  sendSuccess(res, { data });
});

const settings = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSettings(req.user, req.user.organizationId);
  sendSuccess(res, { data });
});

module.exports = { overview, weeklySummary, learningProgress, activityHistory, grocery, settings };
