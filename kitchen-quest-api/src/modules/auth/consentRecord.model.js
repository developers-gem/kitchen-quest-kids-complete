const { Schema, model } = require("mongoose");

/**
 * Evidence trail that a parent (not a child) created the account and
 * acknowledged the consent/privacy terms. Not a substitute for a real
 * legal-reviewed consent flow, but the structural piece that makes such a
 * flow possible later without a schema change — see the audit's §K.
 */
const ConsentRecordSchema = new Schema(
  {
    parentUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    childProfileId: { type: Schema.Types.ObjectId, ref: "ChildProfile", default: null },
    consentType: {
      type: String,
      enum: ["account_creation", "child_profile_creation", "privacy_policy_update"],
      required: true,
    },
    policyVersion: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

ConsentRecordSchema.index({ parentUserId: 1, consentType: 1, createdAt: -1 });

module.exports = model("ConsentRecord", ConsentRecordSchema);
