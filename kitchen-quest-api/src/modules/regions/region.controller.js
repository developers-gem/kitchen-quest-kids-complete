const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const regionService = require("./region.service");

const list = asyncHandler(async (req, res) => {
  const data = await regionService.listRegions({ childId: req.query.childId, familyId: req.user.organizationId });
  sendSuccess(res, { data });
});

const getBySlug = asyncHandler(async (req, res) => {
  const data = await regionService.getRegionBySlug(req.params.slug, {
    childId: req.query.childId,
    familyId: req.user.organizationId,
  });
  sendSuccess(res, { data });
});

module.exports = { list, getBySlug };
