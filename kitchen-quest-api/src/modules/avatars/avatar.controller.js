const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const avatarService = require("./avatar.service");

const list = asyncHandler(async (req, res) => {
  const data = await avatarService.listAvatarCatalog({
    childId: req.query.childId,
    familyId: req.user.organizationId,
  });
  sendSuccess(res, { data });
});

module.exports = { list };
