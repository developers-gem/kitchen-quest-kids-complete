const { z } = require("zod");

const createCosmeticSchema = z.object({
  label: z.string().trim().min(1).max(80),
  slot: z.enum(["hat", "accessory", "background", "colorVariant"]),
  assetKey: z.string().trim().min(1),
  unlockRequirements: z.record(z.any()).optional(),
});

const updateCosmeticSchema = createCosmeticSchema.partial();

module.exports = { createCosmeticSchema, updateCosmeticSchema };
