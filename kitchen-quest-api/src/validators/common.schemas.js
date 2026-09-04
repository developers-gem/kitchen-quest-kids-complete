const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid id format",
});

const paginationQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(), // e.g. "createdAt:desc" or "-createdAt"
  search: z.string().optional(),
});

module.exports = { objectId, paginationQuery };
