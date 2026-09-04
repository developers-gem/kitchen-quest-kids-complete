const { Schema, model } = require("mongoose");
const { auditableContentFields } = require("../admin/shared/auditableContentFields");

/**
 * Full admin CRUD for regions is now built (see modules/admin/regions).
 * `active` has been replaced by the shared draft/review/published/
 * archived workflow (`auditableContentFields()`) so Region behaves
 * identically to Game/Recipe from an editorial standpoint -- a region is
 * visible to children only once `status: "published"`, matching how
 * games/recipes already gate visibility.
 */
const RegionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    scopeType: { type: String, enum: ["usState", "usRegion", "country"], default: "usState" },
    state: { type: String },
    locationDescription: { type: String },
    featuredFoods: { type: [String], default: [] },
    image: { type: String },
    unlockOrder: { type: Number, required: true },
    unlockRequirements: { type: Schema.Types.Mixed, default: { type: "always" } },
    ...auditableContentFields(),
  },
  { timestamps: true }
);

RegionSchema.index({ unlockOrder: 1 });
RegionSchema.index({ status: 1 });

module.exports = model("Region", RegionSchema);
