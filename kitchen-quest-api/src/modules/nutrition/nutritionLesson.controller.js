const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const service = require("./nutritionLesson.service");

const list = asyncHandler(async (req, res) => {
  const { data, meta } = await service.listLessons(req.query, { familyId: req.user.organizationId });
  sendSuccess(res, { data, meta });
});

const getBySlug = asyncHandler(async (req, res) => {
  const data = await service.getBySlug(req.params.slug);
  sendSuccess(res, { data });
});

const complete = asyncHandler(async (req, res) => {
  const data = await service.completeLesson(req.params.id, req.body.childId, req.user.organizationId, {
    answers: req.body.answers,
  });
  sendSuccess(res, {
    data,
    message: data.passed ? "Great job learning something new!" : "Give it another look and try again!",
  });
});

module.exports = { list, getBySlug, complete };
