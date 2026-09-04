const { z } = require("zod");
const { objectId } = require("../../validators/common.schemas");

const listRegionsQuerySchema = z.object({
  childId: objectId.optional(),
});

const regionSlugParamSchema = z.object({ slug: z.string().min(1) });

module.exports = { listRegionsQuerySchema, regionSlugParamSchema };
