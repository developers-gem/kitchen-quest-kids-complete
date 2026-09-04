const ChildProfile = require("./childProfile.model");
const ApiError = require("../../utils/ApiError");
const familyService = require("../families/family.service");
const { signAccessToken } = require("../../utils/tokenUtils");

const MAX_CHILDREN_PER_FAMILY = 8; // sane guardrail, not a hard product decision

async function listForFamily(familyId) {
  return ChildProfile.find({ familyId, deletedAt: null }).sort({ createdAt: 1 });
}

async function getOwned(childId, familyId) {
  const child = await ChildProfile.findOne({ _id: childId, familyId, deletedAt: null });
  if (!child) throw ApiError.notFound("Child profile not found");
  return child;
}

async function createChildProfile(familyId, input) {
  const existingCount = await ChildProfile.countDocuments({ familyId, deletedAt: null });
  if (existingCount >= MAX_CHILDREN_PER_FAMILY) {
    throw ApiError.badRequest(`A family may have at most ${MAX_CHILDREN_PER_FAMILY} child profiles`);
  }

  const child = await ChildProfile.create({ ...input, familyId });
  await familyService.addChildToFamily(familyId, child._id);
  return child;
}

async function updateChildProfile(childId, familyId, patch) {
  const child = await ChildProfile.findOneAndUpdate(
    { _id: childId, familyId, deletedAt: null },
    { $set: patch },
    { new: true, runValidators: true }
  );
  if (!child) throw ApiError.notFound("Child profile not found");
  return child;
}

/** Soft delete — preserves historical progress/XP records for integrity,
 * but the profile disappears from the family's active list immediately. */
async function deleteChildProfile(childId, familyId) {
  const child = await ChildProfile.findOneAndUpdate(
    { _id: childId, familyId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!child) throw ApiError.notFound("Child profile not found");
  await familyService.removeChildFromFamily(familyId, childId);
  return child;
}

/**
 * "Switching child profiles" issues no new credential for the child — it
 * mints a new access token for the *parent's own session* that simply
 * carries an additional `activeChildId` claim, per the auth architecture's
 * parental-gate design (§4). The child never authenticates independently.
 */
async function activateChildProfile(childId, familyId, parentUser) {
  const child = await getOwned(childId, familyId);
  const accessToken = signAccessToken({
    sub: String(parentUser._id),
    role: parentUser.role,
    organizationId: String(parentUser.organizationId),
    activeChildId: String(child._id),
  });
  return { child, accessToken };
}

async function getProgress(childId, familyId) {
  const child = await getOwned(childId, familyId);
  return {
    childId: child._id,
    displayName: child.displayName,
    currentLevel: child.currentLevel,
    totalXP: child.totalXP,
    currentStreak: child.currentStreak,
    longestStreak: child.longestStreak,
    lastActivityDate: child.lastActivityDate,
    progressStats: child.progressStats,
    unlockedRegionsCount: child.unlockedRegions.length,
    badgesCount: child.badges.length,
  };
}

module.exports = {
  listForFamily,
  getOwned,
  createChildProfile,
  updateChildProfile,
  deleteChildProfile,
  activateChildProfile,
  getProgress,
};
