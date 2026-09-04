const { z } = require("zod");

const createRegionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  scopeType: z.enum(["usState", "usRegion", "country"]).default("usState"),
  state: z.string().optional(),
  locationDescription: z.string().optional(),
  featuredFoods: z.array(z.string()).default([]),
  image: z.string().optional(),
  unlockOrder: z.number().int().min(1),
  unlockRequirements: z.record(z.any()).optional(),
});

const updateRegionSchema = createRegionSchema.partial();

module.exports = { createRegionSchema, updateRegionSchema };
