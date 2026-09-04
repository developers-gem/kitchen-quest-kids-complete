/**
 * Converts a normalized 0..1 performance ratio (from gameType.schemas.js
 * scorers) into stars and XP. Exists once, here, so every gameType's
 * reward feels consistent regardless of how its correctness was computed.
 */
function ratioToStars(ratio, maxStars = 3) {
  if (ratio >= 0.95) return maxStars;
  if (ratio >= 0.75) return Math.max(1, maxStars - 1);
  if (ratio >= 0.4) return 1;
  return 0;
}

/**
 * completionRank: how many times (including this one) this child has
 * completed this specific game. First completion earns full xpReward
 * scaled by performance; replays earn a much smaller "practice" reward,
 * both to avoid trivial XP-farming by replaying an easy game forever and
 * to keep the incentive on exploring new content. A daily cap on
 * XP-earning replays is enforced by the service layer, not here.
 */
function calculateXpEarned({ xpReward, ratio, stars, maxStars, completionRank }) {
  if (stars <= 0) return 0;

  const performanceMultiplier = 0.4 + 0.6 * (stars / maxStars); // floor at 40% even for a bare pass
  const baseXp = Math.round(xpReward * performanceMultiplier * Math.max(ratio, stars / maxStars));

  if (completionRank <= 1) return baseXp;

  const REPLAY_XP_RATIO = 0.2;
  return Math.round(baseXp * REPLAY_XP_RATIO);
}

module.exports = { ratioToStars, calculateXpEarned };
