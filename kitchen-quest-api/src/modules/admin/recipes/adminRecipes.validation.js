const { z } = require("zod");
const { AGE_RANGES } = require("../../../config/constants");
const { objectId } = require("../../../validators/common.schemas");

const ingredientLineSchema = z.object({
  ingredientRef: objectId.optional(),
  name: z.string().trim().min(1),
  quantity: z.number().positive().optional(),
  unit: z
    .enum(["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "fl_oz", "oz", "lb", "count", "pinch"])
    .nullable()
    .optional(),
  category: z.string().trim().min(1),
  optional: z.boolean().default(false),
  substitutes: z.array(z.string()).default([]),
});

const recipeStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().trim().min(1),
  instruction: z.string().trim().min(1),
  simpleInstruction: z.string().optional(),
  image: z.string().optional(),
  video: z.string().optional(),
  audioNarration: z.string().optional(),
  estimatedDurationSeconds: z.number().int().positive().optional(),
  safetyLevel: z.enum(["none", "lowHeat", "highHeat", "sharpTool"]).default("none"),
  parentAssistanceRequired: z.boolean().default(false),
});

const createRecipeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().min(1),
  shortDescription: z.string().max(160).optional(),
  coverImage: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  cuisine: z.string().optional(),
  region: objectId.optional(),
  ageGroups: z.array(z.enum(AGE_RANGES)).min(1),
  difficulty: z.enum(["easy", "medium"]).default("easy"),
  preparationTimeMinutes: z.number().int().min(0),
  cookingTimeMinutes: z.number().int().min(0),
  totalTimeMinutes: z.number().int().min(0),
  ingredients: z.array(ingredientLineSchema).min(1),
  steps: z.array(recipeStepSchema).min(1),
  cookingSkills: z.array(z.string()).default([]),
  nutritionLearning: z.array(z.string()).default([]),
  funFacts: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  xpReward: z.number().int().min(0).default(40),
  unlockRequirements: z.record(z.any()).optional(),
  supervisionRequired: z.boolean().default(true),
  knifeSafety: z.boolean().default(false),
  heatSafety: z.boolean().default(false),
  allergenInformation: z.array(z.string()).default([]),
  requiresParentVerification: z.boolean().default(true),
});

const updateRecipeSchema = createRecipeSchema.partial();

module.exports = { createRecipeSchema, updateRecipeSchema };
