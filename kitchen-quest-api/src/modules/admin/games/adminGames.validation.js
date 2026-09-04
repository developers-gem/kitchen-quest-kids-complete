const { z } = require("zod");
const { AGE_RANGES } = require("../../../config/constants");
const { GAME_TYPES } = require("../../games/gameType.schemas");
const { objectId } = require("../../../validators/common.schemas");

const createGameSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  region: objectId.optional(),
  state: z.string().optional(),
  gameType: z.enum(GAME_TYPES),
  ageGroups: z.array(z.enum(AGE_RANGES)).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  description: z.string().optional(),
  learningObjectives: z.array(z.string()).default([]),
  nutritionTopics: z.array(z.string()).default([]),
  foodTopics: z.array(z.string()).default([]),
  instructions: z.string().optional(),
  assetConfig: z.record(z.any()).optional(),
  // Validated more specifically against the gameType's own config schema
  // in adminGames.service.js -- z.record here just ensures it's an
  // object at all before that stricter check runs.
  configuration: z.record(z.any()),
  xpReward: z.number().int().min(0).default(20),
  maxStars: z.number().int().min(1).max(5).default(3),
  unlockRequirements: z.record(z.any()).optional(),
});

const updateGameSchema = createGameSchema.partial();

module.exports = { createGameSchema, updateGameSchema };
