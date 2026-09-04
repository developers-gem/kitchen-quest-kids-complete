const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const familyService = require("./family.service");

const getMyFamily = asyncHandler(async (req, res) => {
  const family = await familyService.getMyFamily(req.user.organizationId);
  sendSuccess(res, { data: family });
});

const updateMyFamily = asyncHandler(async (req, res) => {
  const family = await familyService.updateFamily(req.user.organizationId, req.body);
  sendSuccess(res, { data: family, message: "Family settings updated" });
});

module.exports = { getMyFamily, updateMyFamily };
