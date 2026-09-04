const AvatarConfiguration = require("./avatar.model");
const AvatarCosmetic = require("./avatarCosmetic.model");
const ChildProfile = require("../children/childProfile.model");
const { evaluateUnlockRule } = require("../../utils/unlockRuleEngine");

/** Colors are a small, fixed enum (not admin-managed content) -- matching
 * the original prototype's AVATAR_TONES design exactly, so the web app's
 * existing color-swatch UI needs no changes to work against this API. */
const AVATAR_COLORS = [
  { id: "primary", label: "Tomato" },
  { id: "secondary", label: "Amber" },
  { id: "accent", label: "Sprout" },
  { id: "neutral", label: "Oat" },
];

/**
 * When `childId` is supplied (and owned by the caller's family), every
 * cosmetic is annotated with `unlocked` -- evaluated through the exact
 * same shared unlockRuleEngine that games/recipes/regions/achievements
 * use, never a second unlock concept invented for cosmetics. Without a
 * childId, cosmetics are still listed (e.g. for an admin preview) but
 * without unlock annotation, matching the same optional-child pattern
 * region/game listing already use.
 */
async function listAvatarCatalog({ childId, familyId } = {}) {
  const [characters, cosmetics] = await Promise.all([
    AvatarConfiguration.find({ active: true }).sort({ createdAt: 1 }),
    AvatarCosmetic.find({ status: "published" }).sort({ slot: 1, createdAt: 1 }),
  ]);

  let child = null;
  if (childId && familyId) {
    try {
      child = await ChildProfile.findOne({ _id: childId, familyId, deletedAt: null });
    } catch {
      child = null;
    }
  }

  const cosmeticsData = await Promise.all(
    cosmetics.map(async (c) => {
      const base = { _id: c._id, label: c.label, slot: c.slot, assetKey: c.assetKey };
      if (!child) return base;
      return { ...base, unlocked: await evaluateUnlockRule(c.unlockRequirements, { child }) };
    })
  );

  return { characters, colors: AVATAR_COLORS, cosmetics: cosmeticsData };
}

module.exports = { listAvatarCatalog, AVATAR_COLORS };
