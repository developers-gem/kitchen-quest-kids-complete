const { z } = require("zod");
const { AGE_RANGES } = require("../../config/constants");
const { objectId } = require("../../validators/common.schemas");

const createChildProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(40),
  ageRange: z.enum(AGE_RANGES),
  birthYear: z.number().int().min(2000).max(new Date().getFullYear()).optional(),
  avatarConfigId: objectId.optional(),
  avatarColor: z.enum(["primary", "secondary", "accent", "neutral"]).optional(),
  preferences: z
    .object({
      favoriteFoods: z.array(z.string().max(60)).max(20).optional(),
      dislikedFoods: z.array(z.string().max(60)).max(20).optional(),
      dietaryPreferences: z.array(z.string().max(60)).max(10).optional(),
      allergies: z.array(z.string().max(60)).max(20).optional(),
      accessibilityPreferences: z
        .object({
          reducedMotion: z.boolean().optional(),
          largeText: z.boolean().optional(),
          audioNarration: z.boolean().optional(),
          captions: z.boolean().optional(),
        })
        .partial()
        .optional(),
    })
    .partial()
    .optional(),
});

const updateChildProfileSchema = createChildProfileSchema.partial();

const childIdParamSchema = z.object({
  id: objectId,
});

module.exports = { createChildProfileSchema, updateChildProfileSchema, childIdParamSchema };
