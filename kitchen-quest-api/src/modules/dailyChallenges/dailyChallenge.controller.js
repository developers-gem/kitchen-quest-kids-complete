const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const ChildProfile = require("../children/childProfile.model");
const ApiError = require("../../utils/ApiError");
const service = require("./dailyChallenge.service");

const getToday = asyncHandler(async (req, res) => {
  const child = await ChildProfile.findOne({
    _id: req.query.childId,
    familyId: req.user.organizationId,
    deletedAt: null,
  });
  if (!child) throw ApiError.notFound("Child profile not found");

  const data = await service.getChallengeStatus(child);
  sendSuccess(res, { data });
});

module.exports = { getToday };
