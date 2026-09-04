const { Schema, model } = require("mongoose");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * Closes the one gap in the "Unlocking" requirement that wasn't already
 * covered: Games, Recipes, and Regions all gate visibility behind
 * `unlockRequirements` evaluated by the shared unlockRuleEngine, but
 * AvatarConfiguration (the character catalog) had no unlockable-cosmetic
 * concept at all -- every accessory was equally available to every child
 * from day one. This model is a discrete, admin-authored cosmetic item
 * (a hat, a background, a color variant, ...) with its own
 * `unlockRequirements`, evaluated the exact same way everything else is --
 * no second unlock system invented for cosmetics specifically.
 *
 * Deliberately its own collection rather than a field on
 * AvatarConfiguration: a cosmetic (e.g. "golden chef hat") can apply
 * across multiple characters, and unlocking is a property of the
 * cosmetic itself, not of any one character.
 */
const AvatarCosmeticSchema = new Schema(
  {
    label: { type: String, required: true, trim: true }, // e.g. "Golden Chef Hat"
    slot: { type: String, enum: ["hat", "accessory", "background", "colorVariant"], required: true },
    assetKey: { type: String, required: true }, // storage key / emoji / css token, rendering concern only
    unlockRequirements: { type: Schema.Types.Mixed, default: { type: "always" } },
    ...auditableContentFields(),
  },
  { timestamps: true }
);

AvatarCosmeticSchema.index({ status: 1, slot: 1 });

module.exports = model("AvatarCosmetic", AvatarCosmeticSchema);
