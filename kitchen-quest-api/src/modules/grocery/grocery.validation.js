const { z } = require("zod");
const { objectId } = require("../../validators/common.schemas");

const addCustomItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  category: z.string().max(40).optional(),
});

const itemIdParamSchema = z.object({ itemId: objectId });

const setCheckedSchema = z.object({
  checked: z.boolean(),
});

module.exports = { addCustomItemSchema, itemIdParamSchema, setCheckedSchema };
