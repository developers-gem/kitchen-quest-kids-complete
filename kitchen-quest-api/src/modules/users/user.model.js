const { Schema, model } = require("mongoose");
const { ALL_ROLES, ROLES, USER_STATUS } = require("../../config/constants");

const NotificationPreferenceSchema = new Schema(
  {
    channel: { type: String, enum: ["email", "push", "inApp"], required: true },
    type: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    role: {
      type: [{ type: String, enum: ALL_ROLES }],
      default: [ROLES.PARENT],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "A user must have at least one role",
      },
    },
    firstName: { type: String, trim: true, maxlength: 60 },
    lastName: { type: String, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    passwordHash: {
      type: String,
      select: false,
      required: function () {
        return this.authProvider === "password";
      },
    },
    authProvider: { type: String, enum: ["password", "google", "apple"], default: "password" },
    authProviderId: { type: String, select: false },
    emailVerified: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
    profileImage: { type: String },
    timezone: { type: String, default: "UTC" },
    locale: { type: String, default: "en-US" },
    notificationPreferences: { type: [NotificationPreferenceSchema], default: [] },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ status: 1, deletedAt: 1 });

/** Never leak sensitive fields even if a query forgets to .select() them out. */
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.authProviderId;
  delete obj.__v;
  return obj;
};

module.exports = model("User", UserSchema);
