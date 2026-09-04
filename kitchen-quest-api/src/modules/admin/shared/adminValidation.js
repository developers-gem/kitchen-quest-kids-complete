const { z } = require("zod");
const { objectId } = require("../../../validators/common.schemas");
const { ALL_STATUSES } = require("./contentWorkflow");

const idParamSchema = z.object({ id: objectId });

const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(ALL_STATUSES).optional(),
  search: z.string().optional(),
});

const statusTransitionSchema = z.object({
  status: z.enum(ALL_STATUSES),
});

module.exports = { idParamSchema, listQuerySchema, statusTransitionSchema };
