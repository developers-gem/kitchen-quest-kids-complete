const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const recipeService = require("./recipe.service");

const list = asyncHandler(async (req, res) => {
  const { data, meta } = await recipeService.listRecipes(req.query, { familyId: req.user.organizationId });
  sendSuccess(res, { data, meta });
});

const getBySlug = asyncHandler(async (req, res) => {
  const data = await recipeService.getBySlug(req.params.slug, {
    mode: req.query.mode,
    familyId: req.user.organizationId,
    childId: req.query.childId,
  });
  sendSuccess(res, { data });
});

const start = asyncHandler(async (req, res) => {
  const data = await recipeService.startCooking(req.params.id, req.body.childId, req.user.organizationId);
  sendSuccess(res, { statusCode: 201, data });
});

const getCurrentStep = asyncHandler(async (req, res) => {
  const data = await recipeService.getCurrentStep(req.params.progressId, req.query.childId, req.user.organizationId);
  sendSuccess(res, { data });
});

const advance = asyncHandler(async (req, res) => {
  const data = await recipeService.advanceStep(req.params.progressId, req.body.childId, req.user.organizationId);
  sendSuccess(res, { data });
});

const pause = asyncHandler(async (req, res) => {
  const data = await recipeService.pauseCooking(req.params.progressId, req.body.childId, req.user.organizationId);
  sendSuccess(res, { data, message: "Cooking paused — pick up right where you left off anytime." });
});

const resume = asyncHandler(async (req, res) => {
  const data = await recipeService.resumeCooking(req.params.progressId, req.body.childId, req.user.organizationId);
  sendSuccess(res, { data });
});

const complete = asyncHandler(async (req, res) => {
  const data = await recipeService.completeCooking(req.params.progressId, req.body.childId, req.user.organizationId);
  sendSuccess(res, {
    data,
    message: data.progress.pendingParentVerification
      ? "Great cooking! Ask a grown-up to confirm it in the Parent Dashboard to earn your XP."
      : "Great cooking!",
  });
});

const verify = asyncHandler(async (req, res) => {
  const data = await recipeService.verifyCompletion(req.params.progressId, req.body.childId, req.user.organizationId);
  sendSuccess(res, { data, message: "Confirmed! XP awarded." });
});

const addToGroceryList = asyncHandler(async (req, res) => {
  const list = await recipeService.addToGroceryList(req.params.id, req.user.organizationId);
  sendSuccess(res, { data: list, message: "Ingredients added to your grocery list" });
});

module.exports = { list, getBySlug, start, getCurrentStep, advance, pause, resume, complete, verify, addToGroceryList };
