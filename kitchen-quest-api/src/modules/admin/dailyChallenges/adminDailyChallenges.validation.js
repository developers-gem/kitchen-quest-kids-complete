const { z } = require("zod");
const { AGE_RANGES } = require("../../../config/constants");
const { objectId } = require("../../../validators/common.schemas");

const targetSchema = z.object({
  count: z.number().int().min(1).default(1),
  gameId: objectId.optional(),
  recipeId: objectId.optional(),
});

/**
 * FIXED (gap investigation): challengeType and target used to be
 * validated independently, with no check that a "specific" challenge
 * type actually carried the id it needs. An admin could publish a
 * completeSpecificGame challenge with no gameId at all -- not rejected,
 * not flagged, just silently accepted -- and dailyChallenge.service.js's
 * matching logic (`String(event.gameId) === String(challenge.target.gameId)`)
 * would compare against the literal string "undefined" forever,
 * meaning the challenge would never award progress to any child, with
 * no error anywhere in the pipeline to reveal why. This cross-field
 * check catches it at creation/update time instead.
 */
const baseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().optional(),
  challengeType: z.enum(["completeAnyGame", "completeSpecificGame", "completeAnyRecipe", "completeSpecificRecipe"]),
  target: targetSchema,
  xpReward: z.number().int().min(0).default(25),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
  applicableAgeGroups: z.array(z.enum(AGE_RANGES)).default([...AGE_RANGES]),
});

function requireMatchingTargetId(schema) {
  return schema.superRefine((data, ctx) => {
    if (data.challengeType === "completeSpecificGame" && !data.target?.gameId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target", "gameId"],
        message: "target.gameId is required when challengeType is completeSpecificGame",
      });
    }
    if (data.challengeType === "completeSpecificRecipe" && !data.target?.recipeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target", "recipeId"],
        message: "target.recipeId is required when challengeType is completeSpecificRecipe",
      });
    }
  });
}

const createDailyChallengeSchema = requireMatchingTargetId(baseSchema);

// .partial() must run on the plain object schema, not the refined one --
// ZodEffects (what superRefine produces) has no .partial() method. The
// refinement is re-applied after, so an update payload that DOES include
// challengeType is still held to the same cross-field rule; one that
// omits challengeType entirely (leaving it unchanged) skips the check,
// which is correct since there's nothing new to validate in that case.
const updateDailyChallengeSchema = requireMatchingTargetId(baseSchema.partial());

module.exports = { createDailyChallengeSchema, updateDailyChallengeSchema };
