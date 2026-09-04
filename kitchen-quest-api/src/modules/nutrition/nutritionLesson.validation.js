const { z } = require("zod");
const { AGE_RANGES } = require("../../config/constants");
const { objectId } = require("../../validators/common.schemas");

const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  ageRange: z.enum(AGE_RANGES).optional(),
  topic: z.string().optional(),
  childId: objectId.optional(),
});

const slugParamSchema = z.object({ slug: z.string().min(1) });
const idParamSchema = z.object({ id: objectId });

const completeBodySchema = z.object({
  childId: objectId,
  answers: z.array(z.object({ questionId: z.string(), selectedOptionId: z.string() })).optional(),
});

module.exports = { listQuerySchema, slugParamSchema, idParamSchema, completeBodySchema };
