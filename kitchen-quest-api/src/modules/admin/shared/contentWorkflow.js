const ApiError = require("../../../utils/ApiError");

/**
 * Draft -> Review -> Published -> Archived, plus the realistic escape
 * hatches an editorial workflow actually needs (sending something back
 * for more edits, discarding a draft, unarchiving to revise old content).
 * Defined once, centrally, so every content type (games, recipes,
 * regions, nutrition lessons, food facts, achievements) enforces the
 * identical rules rather than each admin module inventing its own.
 */
const ALLOWED_TRANSITIONS = {
  draft: ["review", "archived"],
  review: ["draft", "published"],
  published: ["archived"],
  archived: ["draft"],
};

const ALL_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

function assertValidTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return; // no-op saves are fine
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw ApiError.badRequest(
      `Cannot move content from "${fromStatus}" to "${toStatus}". Allowed next steps from "${fromStatus}": ${
        allowed.length ? allowed.join(", ") : "none"
      }.`
    );
  }
}

module.exports = { ALLOWED_TRANSITIONS, ALL_STATUSES, assertValidTransition };
