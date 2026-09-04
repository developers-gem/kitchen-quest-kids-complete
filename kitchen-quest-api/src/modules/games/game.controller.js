const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const gameService = require("./game.service");

const list = asyncHandler(async (req, res) => {
  const { data, meta } = await gameService.listGames(req.query, { familyId: req.user.organizationId });
  sendSuccess(res, { data, meta });
});

const getBySlug = asyncHandler(async (req, res) => {
  const data = await gameService.getBySlug(req.params.slug, {
    familyId: req.user.organizationId,
    childId: req.query.childId,
  });
  sendSuccess(res, { data });
});

const start = asyncHandler(async (req, res) => {
  const data = await gameService.startSession(req.params.id, req.body.childId, req.user.organizationId);
  sendSuccess(res, { statusCode: 201, data });
});

const progress = asyncHandler(async (req, res) => {
  const data = await gameService.saveProgress(
    req.body.sessionId,
    req.body.childId,
    req.user.organizationId,
    req.body.progress
  );
  sendSuccess(res, { data });
});

const complete = asyncHandler(async (req, res) => {
  const data = await gameService.completeSession(req.body.sessionId, req.body.childId, req.user.organizationId, {
    outcome: req.body.outcome,
    durationSeconds: req.body.durationSeconds,
  });
  sendSuccess(res, { data, message: data.session.isFirstCompletion ? "Great job — first time completing this one!" : "Nice replay!" });
});

module.exports = { list, getBySlug, start, progress, complete };
