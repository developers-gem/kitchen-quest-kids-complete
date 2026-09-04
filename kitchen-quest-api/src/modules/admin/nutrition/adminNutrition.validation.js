const { z } = require("zod");
const { AGE_RANGES } = require("../../../config/constants");
const { objectId } = require("../../../validators/common.schemas");

const createLessonSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  ageGroups: z.array(z.enum(AGE_RANGES)).min(1),
  topic: z.string().trim().min(1),
  content: z.string().min(1),
  media: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  quiz: z.record(z.any()).optional(),
  xpReward: z.number().int().min(0).default(15),
  region: objectId.optional(),
});
const updateLessonSchema = createLessonSchema.partial();

const createFoodFactSchema = z.object({
  foodName: z.string().trim().min(1).max(80),
  fact: z.string().trim().min(1).max(280),
  ageGroups: z.array(z.enum(AGE_RANGES)).min(1),
  topic: z.string().optional(),
  image: z.string().optional(),
});
const updateFoodFactSchema = createFoodFactSchema.partial();

module.exports = { createLessonSchema, updateLessonSchema, createFoodFactSchema, updateFoodFactSchema };
