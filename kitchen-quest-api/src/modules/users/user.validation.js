const { z } = require("zod");
const { objectId } = require("../../validators/common.schemas");

const updateProfileSchema = z.object({
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  profileImage: z.string().url().optional(),
  notificationPreferences: z
    .array(
      z.object({
        channel: z.enum(["email", "push", "inApp"]),
        type: z.string(),
        enabled: z.boolean(),
      })
    )
    .optional(),
});

const userIdParamSchema = z.object({
  id: objectId,
});

module.exports = { updateProfileSchema, userIdParamSchema };
