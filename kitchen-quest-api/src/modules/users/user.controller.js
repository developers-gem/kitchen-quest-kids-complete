const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const userService = require("./user.service");

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user._id);
  sendSuccess(res, { data: user });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  sendSuccess(res, { data: user, message: "Profile updated" });
});

const deleteMe = asyncHandler(async (req, res) => {
  await userService.softDeleteAccount(req.user._id);
  sendSuccess(res, { statusCode: 200, message: "Account deletion initiated" });
});

module.exports = { getMe, updateMe, deleteMe };
