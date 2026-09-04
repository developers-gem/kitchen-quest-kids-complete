const { z } = require("zod");
const { objectId } = require("../../validators/common.schemas");

const withChildIdQuerySchema = z.object({ childId: objectId });

const activityHistoryQuerySchema = z.object({
  childId: objectId,
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = { withChildIdQuerySchema, activityHistoryQuerySchema };
