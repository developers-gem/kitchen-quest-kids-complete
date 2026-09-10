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

// const deleteAccount = asyncHandler(async (req, res) => {   // this moved to the app.js file to handle deletion by email without requiring authentication
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({
//       success: false,
//       message: "Email is required to delete the account."
//     });
//   }

//   // Delete directly by email without checking req.user
//   await userService.deleteAccountByEmail(email.toLowerCase().trim());

//   sendSuccess(res, { statusCode: 200, message: "Account successfully deleted" });
// });
module.exports = { getMe, updateMe, deleteMe };
