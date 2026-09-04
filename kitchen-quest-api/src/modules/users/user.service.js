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
    { _id: userId },
    { $set: { deletedAt: new Date(), status: "deleted" } },
    { new: true }
  );
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

module.exports = { getById, updateProfile, softDeleteAccount };
