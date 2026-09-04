/**
 * Single source of truth for the XP -> level curve, so games, recipes,
 * daily challenges, and achievements can never compute level independently
 * and drift out of sync with each other.
 *
 * Curve: level N requires N * 100 cumulative XP to have been reached
 * (level 1: 0-99 XP, level 2: 100-199, level 3: 200-299, ...). Simple and
 * easy to tune later -- the important architectural point is that it lives
 * in exactly one place, and it's called from exactly one place at runtime
 * (gamification.service.js's awardXp), never recomputed ad hoc in a
 * controller.
 */
const XP_PER_LEVEL = 100;

function calculateLevel(totalXP) {
  return Math.max(1, Math.floor(totalXP / XP_PER_LEVEL) + 1);
}

function xpForNextLevel(totalXP) {
  const currentLevel = calculateLevel(totalXP);
  return currentLevel * XP_PER_LEVEL;
}

/**
 * Renders a Date as a "YYYY-MM-DD" calendar-day key IN A GIVEN IANA
 * TIMEZONE -- this is the actual timezone-aware day-boundary handling the
 * streak system needs: "today" for a family in America/Los_Angeles and a
 * family in Asia/Tokyo are different UTC windows, and a child playing at
 * 11pm local time shouldn't have that count as "tomorrow" just because
 * it's already past midnight UTC.
 *
 * Uses Intl.DateTimeFormat (built into Node, zero extra dependencies)
 * rather than a date library -- the 'en-CA' locale formats dates as
 * YYYY-MM-DD, which is the one built-in locale format that's already ISO
 * calendar-key shaped.
 *
 * Falls back to 'UTC' if no timezone is supplied or the timezone string
 * is invalid, rather than throwing -- a bad/missing timezone shouldn't
 * crash the streak calculation, it should degrade to the previous
 * (UTC-only) behavior.
 */
function dayKeyInTimezone(date, timezone = "UTC") {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(date);
  }
}

/**
 * Streak calculation. `timezone` should be the owning parent's
 * `User.timezone` (an IANA string like "America/Denver") -- callers are
 * responsible for passing the right one; this function has no way to
 * know which family a child belongs to.
 *
 * Same-day handling: if the child already has activity recorded today
 * (in the given timezone), the streak does not increase again --
 * multiple games/recipes completed in one day count as one day of
 * activity, not one day per action.
 *
 * Missed-day handling: any gap of 2+ calendar days resets the streak to 1
 * (today's activity still counts as the first day of a new streak, it
 * doesn't zero out entirely).
 */
function updateStreak({ currentStreak, lastActivityDate, timezone = "UTC" }, now = new Date()) {
  if (!lastActivityDate) {
    return { currentStreak: 1, streakIncreased: true, streakBroken: false };
  }

  const todayKey = dayKeyInTimezone(now, timezone);
  const lastKey = dayKeyInTimezone(new Date(lastActivityDate), timezone);

  if (todayKey === lastKey) {
    return { currentStreak, streakIncreased: false, streakBroken: false };
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  // Both keys are "YYYY-MM-DD" -- parsing them as UTC-anchored dates and
  // diffing in days is safe regardless of the actual timezone, since
  // we're only diffing calendar-day *labels*, not instants.
  const gapDays = Math.round((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${lastKey}T00:00:00Z`)) / oneDayMs);

  if (gapDays === 1) {
    return { currentStreak: currentStreak + 1, streakIncreased: true, streakBroken: false };
  }

  return { currentStreak: 1, streakIncreased: true, streakBroken: gapDays > 1 };
}

module.exports = { calculateLevel, xpForNextLevel, updateStreak, dayKeyInTimezone, XP_PER_LEVEL };
