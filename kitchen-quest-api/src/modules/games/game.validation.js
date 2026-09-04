const { z } = require("zod");
const { AGE_RANGES } = require("../../config/constants");
const { objectId } = require("../../validators/common.schemas");
const { GAME_TYPES } = require("./gameType.schemas");

const listGamesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  ageRange: z.enum(AGE_RANGES).optional(),
  gameType: z.enum(GAME_TYPES).optional(),
  region: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  search: z.string().optional(),
  childId: objectId.optional(),
});

const gameIdParamSchema = z.object({ id: objectId });
const gameSlugParamSchema = z.object({ slug: z.string().min(1) });

const startSessionBodySchema = z.object({
  childId: objectId,
});

const saveProgressBodySchema = z.object({
  sessionId: objectId,
  childId: objectId,
  progress: z.record(z.any()).optional(), // free-form in-progress state (e.g. current question index) — display/resume only, never trusted for scoring
});

// The `outcome` field's exact shape depends on the game's gameType and is
// validated separately (against gameType.schemas.js) inside the service,
// since it can't be known generically at the route-validation layer.
const completeSessionBodySchema = z.object({
  sessionId: objectId,
  childId: objectId,
  durationSeconds: z.number().min(0).max(3600).optional(),
  outcome: z.record(z.any()),
});

module.exports = {
  listGamesQuerySchema,
  gameIdParamSchema,
  gameSlugParamSchema,
  startSessionBodySchema,
  saveProgressBodySchema,
  completeSessionBodySchema,
};
