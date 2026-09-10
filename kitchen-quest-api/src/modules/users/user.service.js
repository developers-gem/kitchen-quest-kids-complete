const User = require("./user.model");
const ApiError = require("../../utils/ApiError");

async function getById(userId) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

async function updateProfile(userId, patch) {
  const user = await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    { $set: patch },
    { new: true, runValidators: true }
  );
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

/**
 * Soft-deletes the account. Cascading deletion/anonymization of child
 * profiles, sessions, etc. is orchestrated by a dedicated data-erasure
 * job in a later phase (per the audit's COPPA data-deletion requirement);
 * this call marks the intent and immediately revokes access.
 */
async function softDeleteAccount(userId) {
  const user = await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    { $set: { deletedAt: new Date(), status: "deleted", isActive: false } },
    { new: true }
  );
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

// async function deleteAccountByEmail(email) {// moved to the app.js file to handle deletion by email without requiring authentication
//   const normalizedEmail = email.toLowerCase().trim();

//   const user = await User.findOneAndUpdate(
//     { email: normalizedEmail, deletedAt: null },
//     { $set: { deletedAt: new Date(), status: "deleted", isActive: false } },
//     { new: true }
//   );

//   if (!user) {
//     throw ApiError.notFound("No active account found associated with this email address.");
//   }

//   return user;
// }

module.exports = {
  getById,
  updateProfile,
  softDeleteAccount,
};