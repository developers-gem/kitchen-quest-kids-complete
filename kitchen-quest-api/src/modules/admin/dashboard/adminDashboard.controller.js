const asyncHandler = require("../../../utils/asyncHandler");
const { sendSuccess } = require("../../../utils/ApiResponse");
const service = require("./adminDashboard.service");

const getOverview = asyncHandler(async (req, res) => {
  const data = await service.getOverview();
  sendSuccess(res, { data });
});

module.exports = { getOverview };
