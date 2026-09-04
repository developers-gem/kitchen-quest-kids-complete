const { z } = require("zod");
const { AGE_RANGES } = require("../../config/constants");
const { objectId } = require("../../validators/common.schemas");

const listRecipesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  ageRange: z.enum(AGE_RANGES).optional(),
  difficulty: z.enum(["easy", "medium"]).optional(),
  maxTotalTimeMinutes: z.string().optional(),
  allergenFree: z.string().optional(), // comma-separated list of allergens to exclude
  search: z.string().optional(),
  childId: objectId.optional(),
});

const recipeSlugParamSchema = z.object({ slug: z.string().min(1) });
const recipeIdParamSchema = z.object({ id: objectId });
const progressIdParamSchema = z.object({ progressId: objectId });

const detailQuerySchema = z.object({
  mode: z.enum(["child", "parent"]).default("parent"),
  childId: objectId.optional(),
});

const withChildIdBodySchema = z.object({ childId: objectId });
const withChildIdQuerySchema = z.object({ childId: objectId });

module.exports = {
  listRecipesQuerySchema,
  recipeSlugParamSchema,
  recipeIdParamSchema,
  progressIdParamSchema,
  detailQuerySchema,
  withChildIdBodySchema,
  withChildIdQuerySchema,
};
