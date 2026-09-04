const Organization = require("./family.model");
const ApiError = require("../../utils/ApiError");
const { ORGANIZATION_TYPES } = require("../../config/constants");

/** Called once, at registration, to create the default family for a new parent. */
async function createFamilyForNewUser({ userId, familyName }) {
  const org = await Organization.create({
    type: ORGANIZATION_TYPES.FAMILY,
    familyName: familyName || undefined,
    primaryParent: userId,
    members: [userId],
  });
  return org;
}

async function getMyFamily(organizationId) {
  const org = await Organization.findOne({ _id: organizationId, deletedAt: null }).populate(
    "childProfiles",
    "displayName ageRange avatarConfigId currentLevel currentStreak"
  );
  if (!org) throw ApiError.notFound("Family not found");
  return org;
}

async function updateFamily(organizationId, patch) {
  const org = await Organization.findOneAndUpdate(
    { _id: organizationId, deletedAt: null },
    { $set: patch },
    { new: true, runValidators: true }
  );
  if (!org) throw ApiError.notFound("Family not found");
  return org;
}

/**
 * Keeps Organization.childProfiles in sync. This array is a denormalized
 * convenience for fast reads — ChildProfile.familyId remains the
 * authoritative link, so this helper is the *only* place this array is
 * mutated (per the "avoid duplicate/drifting data" principle from the
 * database architecture doc).
 */
async function addChildToFamily(organizationId, childProfileId) {
  await Organization.updateOne({ _id: organizationId }, { $addToSet: { childProfiles: childProfileId } });
}

async function removeChildFromFamily(organizationId, childProfileId) {
  await Organization.updateOne({ _id: organizationId }, { $pull: { childProfiles: childProfileId } });
}

module.exports = {
  createFamilyForNewUser,
  getMyFamily,
  updateFamily,
  addChildToFamily,
  removeChildFromFamily,
};
