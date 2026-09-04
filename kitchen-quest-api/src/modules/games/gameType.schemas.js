const { z } = require("zod");

/**
 * ============================================================================
 * THE REUSABLE MINI-GAME FRAMEWORK — core idea
 * ============================================================================
 * A `Game` document (game.model.js) is generic: title, region, ageGroups,
 * xpReward, unlockRequirements, etc. — plus exactly two `gameType`-specific
 * fields: `configuration` (the admin-authored content: questions, bins,
 * pairs, maze layout, ...) and, at completion time, an `outcome` payload the
 * *client* submits describing what happened during play.
 *
 * Adding an 11th, 20th, or 50th game NEVER requires new backend code as
 * long as it fits one of the 9 gameTypes below — it's a new `Game` document
 * with a new `configuration` payload. Adding an entirely new *mechanic*
 * means adding one new gameType here (a config schema + an outcome schema +
 * a scoring function) — still not one bespoke module per game.
 *
 * Anti-cheat design: for "checkable" types (quiz, matching, sorting,
 * sequence) the client submits raw *answers*, never a score — the server
 * looks up the correct answer key in `configuration` and computes
 * correctness itself. For "reported-metric" types (memory, maze,
 * ingredientBuilder, timedChallenge, dragAndDrop) full server-side replay
 * of the interaction isn't practical without duplicating the renderer, so
 * the client reports raw performance counters (correct taps, time taken,
 * collectibles found) which the server *validates against configured
 * bounds* (e.g. matchesFound can never exceed configuration.pairs.length)
 * before computing score/stars/XP from them. This is a deliberate,
 * documented trade-off, not an oversight — see the "Known limitation" note
 * at the bottom of this file.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// CONFIG SCHEMAS — admin-authored content, shape depends on gameType
// ---------------------------------------------------------------------------

const quizConfigSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        image: z.string().optional(),
        options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
        correctOptionId: z.string(),
      })
    )
    .min(1),
});

const matchingConfigSchema = z.object({
  items: z
    .array(z.object({ id: z.string(), promptLabel: z.string(), matchLabel: z.string(), image: z.string().optional() }))
    .min(2),
});

const sortingConfigSchema = z.object({
  bins: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
  items: z.array(z.object({ id: z.string(), label: z.string(), correctBinId: z.string(), image: z.string().optional() })).min(2),
});

const memoryConfigSchema = z.object({
  pairs: z.array(z.object({ id: z.string(), label: z.string(), icon: z.string().optional() })).min(2),
  parMoves: z.number().int().positive().optional(), // used for star thresholds
});

const sequenceConfigSchema = z.object({
  steps: z.array(z.object({ id: z.string(), label: z.string(), image: z.string().optional() })).min(2),
  // steps array order == the correct order
});

const dragAndDropConfigSchema = z.object({
  slots: z
    .array(z.object({ id: z.string(), order: z.number().int(), label: z.string(), correctItemId: z.string() }))
    .min(2),
  draggableItems: z.array(z.object({ id: z.string(), label: z.string(), image: z.string().optional() })).min(2),
});

const mazeConfigSchema = z.object({
  layoutKey: z.string(), // references a client-side maze layout asset
  collectibles: z.array(z.object({ id: z.string(), label: z.string(), isCorrectFood: z.boolean() })).min(2),
  timeLimitSeconds: z.number().int().positive().optional(),
});

const ingredientBuilderConfigSchema = z.object({
  targetItems: z.array(z.object({ id: z.string(), label: z.string(), image: z.string().optional() })).min(1),
  distractorItems: z.array(z.object({ id: z.string(), label: z.string(), image: z.string().optional() })).default([]),
});

const timedChallengeConfigSchema = z.object({
  timeLimitSeconds: z.number().int().positive(),
  targetCorrectCount: z.number().int().positive(),
  items: z.array(z.object({ id: z.string(), label: z.string(), isCorrect: z.boolean() })).min(2),
});

const CONFIG_SCHEMAS = {
  quiz: quizConfigSchema,
  matching: matchingConfigSchema,
  sorting: sortingConfigSchema,
  memory: memoryConfigSchema,
  sequence: sequenceConfigSchema,
  dragAndDrop: dragAndDropConfigSchema,
  maze: mazeConfigSchema,
  ingredientBuilder: ingredientBuilderConfigSchema,
  timedChallenge: timedChallengeConfigSchema,
};

const GAME_TYPES = Object.keys(CONFIG_SCHEMAS);

// ---------------------------------------------------------------------------
// OUTCOME SCHEMAS — what the client submits to POST /games/:id/complete
// Never includes score, stars, or XP — those are always server-computed.
// ---------------------------------------------------------------------------

const OUTCOME_SCHEMAS = {
  quiz: z.object({
    answers: z.array(z.object({ questionId: z.string(), selectedOptionId: z.string() })),
  }),
  matching: z.object({
    matchedPairs: z.array(z.object({ itemId: z.string(), matchedWithItemId: z.string() })),
  }),
  sorting: z.object({
    placements: z.array(z.object({ itemId: z.string(), binId: z.string() })),
  }),
  memory: z.object({
    matchesFound: z.number().int().min(0),
    attempts: z.number().int().min(0),
    timeTakenSeconds: z.number().min(0),
  }),
  sequence: z.object({
    submittedOrder: z.array(z.string()),
  }),
  dragAndDrop: z.object({
    placements: z.array(z.object({ slotId: z.string(), itemId: z.string() })),
  }),
  maze: z.object({
    collectedItemIds: z.array(z.string()),
    timeTakenSeconds: z.number().min(0),
    reachedExit: z.boolean(),
  }),
  ingredientBuilder: z.object({
    selectedItemIds: z.array(z.string()),
  }),
  timedChallenge: z.object({
    tappedItemIds: z.array(z.string()),
    timeTakenSeconds: z.number().min(0),
  }),
};

// ---------------------------------------------------------------------------
// SCORING — pure functions: (configuration, outcome) -> { correct, total, ratio }
// `ratio` (0..1) is what game.service.js uses to derive stars/xp uniformly
// across every gameType, so the reward formula only has to exist once.
// ---------------------------------------------------------------------------

function scoreQuiz(config, outcome) {
  const answerMap = new Map(outcome.answers.map((a) => [a.questionId, a.selectedOptionId]));
  let correct = 0;
  config.questions.forEach((q) => {
    if (answerMap.get(q.id) === q.correctOptionId) correct += 1;
  });
  return { correct, total: config.questions.length, ratio: correct / config.questions.length };
}

function scoreMatching(config, outcome) {
  const total = config.items.length;
  let correct = 0;
  outcome.matchedPairs.forEach((m) => {
    if (m.itemId === m.matchedWithItemId) correct += 1; // an item's correct match is itself, by id
  });
  correct = Math.min(correct, total);
  return { correct, total, ratio: total ? correct / total : 0 };
}

function scoreSorting(config, outcome) {
  const correctBinById = new Map(config.items.map((i) => [i.id, i.correctBinId]));
  const total = config.items.length;
  let correct = 0;
  outcome.placements.forEach((p) => {
    if (correctBinById.get(p.itemId) === p.binId) correct += 1;
  });
  return { correct, total, ratio: total ? correct / total : 0 };
}

function scoreMemory(config, outcome) {
  const total = config.pairs.length;
  const matchesFound = Math.min(outcome.matchesFound, total); // clamp — never trust over-reporting
  const parMoves = config.parMoves || total * 2;
  // Efficiency bonus: finding all pairs within (or under) par moves scores
  // higher than finding them all in many more attempts.
  const efficiency = outcome.attempts > 0 ? Math.min(1, parMoves / outcome.attempts) : 0;
  const ratio = total ? (matchesFound / total) * (0.6 + 0.4 * efficiency) : 0;
  return { correct: matchesFound, total, ratio: Math.min(1, ratio) };
}

function scoreSequence(config, outcome) {
  const correctOrder = config.steps.map((s) => s.id);
  const total = correctOrder.length;
  let correct = 0;
  outcome.submittedOrder.forEach((id, idx) => {
    if (correctOrder[idx] === id) correct += 1;
  });
  return { correct, total, ratio: total ? correct / total : 0 };
}

function scoreDragAndDrop(config, outcome) {
  const correctItemBySlot = new Map(config.slots.map((s) => [s.id, s.correctItemId]));
  const total = config.slots.length;
  let correct = 0;
  outcome.placements.forEach((p) => {
    if (correctItemBySlot.get(p.slotId) === p.itemId) correct += 1;
  });
  return { correct, total, ratio: total ? correct / total : 0 };
}

function scoreMaze(config, outcome) {
  // Server looks up correctness itself from the raw picked-item ids rather
  // than trusting client-aggregated counts — the client can only spoof
  // this by guessing valid item ids, which are also what it needs to
  // render the maze at all.
  const correctIds = new Set(config.collectibles.filter((c) => c.isCorrectFood).map((c) => c.id));
  const incorrectIds = new Set(config.collectibles.filter((c) => !c.isCorrectFood).map((c) => c.id));
  const pickedUnique = new Set(outcome.collectedItemIds);

  let correct = 0;
  let incorrect = 0;
  pickedUnique.forEach((id) => {
    if (correctIds.has(id)) correct += 1;
    else if (incorrectIds.has(id)) incorrect += 1;
  });

  const total = correctIds.size;
  const penalty = Math.min(0.5, incorrect * 0.1);
  const exitBonus = outcome.reachedExit ? 1 : 0.5;
  const ratio = total ? Math.max(0, (correct / total) * exitBonus - penalty) : 0;
  return { correct, total, ratio: Math.min(1, ratio) };
}

function scoreIngredientBuilder(config, outcome) {
  const targetIds = new Set(config.targetItems.map((i) => i.id));
  const distractorIds = new Set(config.distractorItems.map((i) => i.id));
  const selected = new Set(outcome.selectedItemIds);
  let correct = 0;
  let distractorsPicked = 0;
  selected.forEach((id) => {
    if (targetIds.has(id)) correct += 1;
    else if (distractorIds.has(id)) distractorsPicked += 1;
  });
  const total = targetIds.size;
  const penalty = Math.min(0.5, distractorsPicked * 0.15);
  const ratio = total ? Math.max(0, correct / total - penalty) : 0;
  return { correct, total, ratio: Math.min(1, ratio) };
}

function scoreTimedChallenge(config, outcome) {
  const correctIds = new Set(config.items.filter((i) => i.isCorrect).map((i) => i.id));
  const incorrectIds = new Set(config.items.filter((i) => !i.isCorrect).map((i) => i.id));
  const tappedUnique = new Set(outcome.tappedItemIds);

  let correct = 0;
  let incorrect = 0;
  tappedUnique.forEach((id) => {
    if (correctIds.has(id)) correct += 1;
    else if (incorrectIds.has(id)) incorrect += 1;
  });

  const total = config.targetCorrectCount;
  const penalty = Math.min(0.5, incorrect * 0.05);
  const ratio = total ? Math.max(0, correct / total - penalty) : 0;
  return { correct, total, ratio: Math.min(1, ratio) };
}

const SCORERS = {
  quiz: scoreQuiz,
  matching: scoreMatching,
  sorting: scoreSorting,
  memory: scoreMemory,
  sequence: scoreSequence,
  dragAndDrop: scoreDragAndDrop,
  maze: scoreMaze,
  ingredientBuilder: scoreIngredientBuilder,
  timedChallenge: scoreTimedChallenge,
};

function scoreOutcome(gameType, configuration, outcome) {
  const scorer = SCORERS[gameType];
  if (!scorer) throw new Error(`No scorer registered for gameType "${gameType}"`);
  return scorer(configuration, outcome);
}

function validateConfig(gameType, configuration) {
  const schema = CONFIG_SCHEMAS[gameType];
  if (!schema) throw new Error(`Unknown gameType "${gameType}"`);
  return schema.parse(configuration);
}

function validateOutcome(gameType, outcome) {
  const schema = OUTCOME_SCHEMAS[gameType];
  if (!schema) throw new Error(`Unknown gameType "${gameType}"`);
  return schema.parse(outcome);
}

// ---------------------------------------------------------------------------
// REDACTION — strips the answer key from "solve a puzzle" gameTypes before
// configuration is ever sent to a client. A quiz's correctOptionId, a
// sorting item's correctBinId, and a dragAndDrop slot's correctItemId are
// the actual thing being tested — shipping them defeats server-side
// scoring entirely, since a client could just read them back and submit a
// perfect outcome without playing. "Recognition" gameTypes (maze,
// timedChallenge, ingredientBuilder, memory) don't get this treatment:
// their content IS what the child needs to see to play at all (e.g. which
// foods are healthy is the lesson, not a hidden key), and their outcomes
// are scored server-side from raw picked-item ids regardless — see the
// scorers above.
// ---------------------------------------------------------------------------

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function redactConfigForClient(gameType, configuration) {
  switch (gameType) {
    case "quiz":
      return {
        questions: configuration.questions.map(({ correctOptionId, ...rest }) => rest),
      };
    case "sorting":
      return {
        bins: configuration.bins,
        items: shuffle(configuration.items.map(({ correctBinId, ...rest }) => rest)),
      };
    case "dragAndDrop":
      return {
        slots: configuration.slots.map(({ correctItemId, ...rest }) => rest),
        draggableItems: shuffle(configuration.draggableItems),
      };
    case "sequence":
      // The array's own order IS the answer key — ship a shuffled copy so
      // a client can't just echo the response back for a perfect score.
      return { steps: shuffle(configuration.steps) };
    default:
      return configuration; // maze, timedChallenge, ingredientBuilder, memory, matching: no redaction needed
  }
}

module.exports = {
  GAME_TYPES,
  CONFIG_SCHEMAS,
  OUTCOME_SCHEMAS,
  validateConfig,
  validateOutcome,
  scoreOutcome,
  redactConfigForClient,
};

/**
 * Known limitation (documented, not hidden): for reported-metric gameTypes
 * (memory, maze, ingredientBuilder, timedChallenge, and dragAndDrop's timing
 * if added later) a sufficiently motivated cheater could fabricate a
 * favorable outcome payload, since the server doesn't replay the actual
 * interaction. Mitigations already in place: values are clamped against
 * configuration-derived maximums (§scoreMemory/scoreMaze/etc.), the daily
 * replay-XP cap in game.service.js bounds the damage of repeated abuse, and
 * every session is logged with its full outcome payload for later audit.
 * A stronger mitigation (server-side replay for at least the highest-value
 * gameTypes, or signed/attested client telemetry) is a reasonable Phase 3+
 * investment if abuse is observed in practice — not built preemptively here.
 */
