const { Schema, model } = require("mongoose");

/**
 * A curated, admin-managed catalog — never user-uploaded images. This is
 * a deliberate child-safety simplification (see the earlier database
 * design doc): zero moderation surface, since a child can only ever pick
 * from what an admin has already vetted.
 */
const AvatarConfigurationSchema = new Schema(
  {
    avatarType: { type: String, enum: ["emoji", "illustrated", "photo"], default: "emoji" },
    characterId: { type: String, required: true, unique: true }, // e.g. "fox", "chef-hat-kid"
    label: { type: String, required: true }, // display name, e.g. "Fox"
    emoji: { type: String }, // the actual glyph for avatarType "emoji"
    accessories: { type: [String], default: [] },
    unlockedCosmetics: { type: [String], default: [] },
    isSystemDefault: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AvatarConfigurationSchema.index({ active: 1, isSystemDefault: 1 });

module.exports = model("AvatarConfiguration", AvatarConfigurationSchema);
