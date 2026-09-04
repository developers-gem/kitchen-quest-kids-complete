const { Schema, model } = require("mongoose");
const { ORGANIZATION_TYPES, AGE_RANGES } = require("../../config/constants");

/**
 * "Family" is implemented as an Organization with type "family", the same
 * base entity a future "school" org will use — see the architecture doc's
 * §5/§J rationale for generalizing this from day one instead of building
 * two near-identical collections.
 */
const OrganizationSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(ORGANIZATION_TYPES),
      default: ORGANIZATION_TYPES.FAMILY,
      required: true,
    },
    familyName: { type: String, trim: true, maxlength: 100 },
    primaryParent: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    childProfiles: [{ type: Schema.Types.ObjectId, ref: "ChildProfile" }],
    subscription: {
      plan: { type: String, enum: ["free", "premium"], default: "free" },
      status: { type: String, enum: ["active", "canceled", "pastDue"], default: "active" },
      renewsAt: { type: Date },
    },
    settings: {
      contentRestrictionLevel: { type: String, enum: ["standard", "strict"], default: "standard" },
      allowedAgeBands: { type: [{ type: String, enum: AGE_RANGES }], default: [...AGE_RANGES] },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrganizationSchema.index({ primaryParent: 1 });
OrganizationSchema.index({ members: 1 });
OrganizationSchema.index({ type: 1 });

module.exports = model("Organization", OrganizationSchema);
