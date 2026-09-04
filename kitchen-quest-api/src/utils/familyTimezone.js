const Organization = require("../modules/families/family.model");
const User = require("../modules/users/user.model");

/**
 * ChildProfile has no timezone of its own -- streak day-boundaries use
 * the owning family's primary parent's `User.timezone` (set at
 * registration from the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`,
 * per the web app's RegisterPage). This is the one helper that resolves
 * "which timezone applies to this child," so it's computed the same way
 * everywhere a streak or day-boundary decision is made, rather than each
 * call site re-deriving it (or worse, forgetting to and silently
 * defaulting to UTC).
 *
 * Falls back to "UTC" if anything in the chain is missing -- a family
 * without a resolvable timezone shouldn't crash a completion flow, it
 * should degrade gracefully to the same UTC-anchored behavior the system
 * had before per-family timezones existed.
 */
async function getFamilyTimezone(familyId) {
  try {
    const organization = await Organization.findById(familyId);
    if (!organization || !organization.primaryParent) return "UTC";

    const parent = await User.findById(organization.primaryParent);
    return parent?.timezone || "UTC";
  } catch {
    return "UTC";
  }
}

module.exports = { getFamilyTimezone };
