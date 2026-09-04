const ChildProfile = require("../modules/children/childProfile.model");
const ApiError = require("./ApiError");

/**
 * FIXED (production readiness audit, finding C1): this exact function
 * used to be copy-pasted verbatim across six service/controller files
 * (dashboard, recipes, regions, achievements, games, nutrition lessons).
 * It's a security-relevant check -- confirming a child profile belongs
 * to the calling family before any read/write proceeds -- so having six
 * independent copies was a real risk: a future change (e.g. also
 * rejecting a suspended child) could easily be applied to five of six
 * and miss one. Centralized here as the single source of truth; every
 * former copy now imports this instead.
 */
async function getOwnedChild(childId, familyId) {
  const child = await ChildProfile.findOne({ _id: childId, familyId, deletedAt: null });
  if (!child) throw ApiError.notFound("Child profile not found");
  return child;
}

module.exports = { getOwnedChild };
