const { z } = require("zod");
const { AGE_RANGES } = require("../../config/constants");

const updateFamilySchema = z.object({
  familyName: z.string().trim().max(100).optional(),
  settings: z
    .object({
      contentRestrictionLevel: z.enum(["standard", "strict"]).optional(),
      allowedAgeBands: z.array(z.enum(AGE_RANGES)).optional(),
    })
    .partial()
    .optional(),
});

module.exports = { updateFamilySchema };
