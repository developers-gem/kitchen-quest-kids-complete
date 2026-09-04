# Kitchen Quest Kids — Gamification Engine

Covers XP, Levels, Streaks, Stars, Achievements, Badges, Region Unlocking,
Daily Challenges, and the broader data-driven unlock system (Games,
Recipes, Regions, Avatar Cosmetics).

## 1. Architecture

### 1.1 The core invariant

**`ChildProfile.totalXP` is never mutated directly, anywhere, except
inside one function.** Every XP-earning event -- completing a game,
completing a recipe, completing a nutrition lesson, completing a daily
challenge, reaching a streak milestone, earning an achievement -- routes
through `gamification.service.js`'s `awardXp()`, which always writes an
`XPTransaction` first and only then updates the cached total. The same
discipline applies to streaks: `recordActivity()` is the only function
that touches `currentStreak`/`longestStreak`/`lastActivityDate`.

This isn't just a convention -- it's checked by the test suite
(`tests/gamification.test.js`: "every XP-earning game completion creates
exactly one matching XPTransaction") and by code review discipline: any
new code that writes `child.totalXP +=` outside `gamification.service.js`
is a bug by definition, not a stylistic nitpick.

### 1.2 Module map

```
src/
  utils/
    xpEngine.js            level formula + timezone-aware streak math (pure functions, no I/O)
    unlockRuleEngine.js     ONE rule evaluator for every "is this unlocked"
                            question in the system (games, recipes, regions,
                            avatar cosmetics, AND achievement criteria)
    familyTimezone.js       resolves a child's owning family's timezone
                            (User.timezone) -- the single place this lookup
                            happens, used by every completion flow that
                            needs a day-boundary decision
  modules/
    gamification/
      gamification.config.js   tunable constants: perfect-score bonus,
                                streak milestone bonuses/lengths
      gamification.service.js  awardXp(), recordActivity() -- the two
                                functions everything else calls
    xp/
      xpTransaction.model.js   the append-only ledger
    achievements/
      achievement.model.js        admin-authored content (title, criteria, xpReward, rarity)
      childAchievement.model.js   join collection: who earned what, when
      achievementEngine.service.js  checkAndAwardAchievements(child)
      achievement.controller.js / .routes.js   child-facing read endpoints
    dailyChallenges/
      dailyChallenge.model.js         admin-authored, date-windowed challenge
      childChallengeProgress.model.js per-child progress toward today's challenge
      dailyChallenge.service.js       getChallengeStatus(), recordChallengeProgress()
      dailyChallenge.controller.js / .routes.js
    avatars/
      avatar.model.js           character catalog (unchanged)
      avatarCosmetic.model.js   unlockable cosmetic items (NEW)
      avatar.service.js         catalog + per-child cosmetic unlock annotation
    admin/
      shared/
        contentWorkflow.js              draft/review/published/archived state machine
        auditableContentFields.js       status/version/createdBy/updatedBy/publishedBy
        adminContentServiceFactory.js   generic CRUD+workflow, reused by every content type
      achievements/, dailyChallenges/, avatarCosmetics/, games/, recipes/,
      regions/, nutrition/     admin CRUD for each content type, built on the factory
    games/, recipes/, nutrition/   completion flows -- call into gamification.service,
                                    achievementEngine, dailyChallenge.service after
                                    every successful completion
```

### 1.3 Why one rule engine for everything

`unlockRuleEngine.evaluateUnlockRule(rule, { child })` is called for:
`Game.unlockRequirements`, `Recipe.unlockRequirements`,
`Region.unlockRequirements`, `AvatarCosmetic.unlockRequirements`, and
`Achievement.unlockCriteria`. These are the same *kind* of question --
"given this child's current state, does this data-described condition
hold?" -- so they share one evaluator and one rule vocabulary
(`always`, `levelAtLeast`, `streakAtLeast`, `longestStreakAtLeast`,
`foodsExploredAtLeast`, `nutritionQuestsCompletedAtLeast`,
`gamesCompletedAtLeast`, `recipesCompletedAtLeast`, `firstGame`,
`firstRecipe`, `gameCompleted`, `recipeCompleted`, `gameStarsAtLeast`,
`regionsExploredAtLeast`, `allOf`, `anyOf`). Adding a new rule *type*
means adding one `case` in one file -- never touching every content type
that might someday want it. Unknown rule types fail closed (locked),
never silently unlocking content an admin didn't intend to ship.

## 2. Backend services (what each one owns)

| Service | Owns | Never does |
|---|---|---|
| `gamification.service.js` | `totalXP`, `currentLevel`, `currentStreak`, `longestStreak`, `lastActivityDate` | Decide *whether* an event deserves XP -- callers compute the amount, this only records and applies it |
| `achievementEngine.service.js` | `ChildAchievement` records, `ChildProfile.badges[]` | Decide game/recipe scoring -- it only reads already-updated child state |
| `dailyChallenge.service.js` | `ChildChallengeProgress` | Fabricate a challenge when none is scheduled (returns `null`, honestly) |
| `avatar.service.js` | Read-only catalog + per-child unlock annotation | Mutate any unlock state -- cosmetics have no "claim" step, just visibility |
| `game.service.js` / `recipe.service.js` / `nutritionLesson.service.js` | Scoring, XP *amount* calculation, orchestrating the call sequence below | Touch `totalXP`/streak fields directly |

### 2.1 The canonical completion sequence

Every completion flow (game, recipe, lesson) follows the same order, and
the reason for the order is itself load-bearing:

1. Score the attempt server-side (never trust a client-submitted score).
2. `awardXp(...)` for the base reward (+ any bonus, e.g. perfect score).
3. Update `progressStats` counters (`gamesCompleted`, `foodsTried`, ...).
4. `recordActivity(child, timezone)` -- updates the streak, and pays a
   milestone bonus via `awardXp` internally if a threshold was reached.
5. Save `child`.
6. `recordChallengeProgress(child, event)` -- checked *before* achievements
   so any XP a challenge completion awards is already on `child` when
   achievement criteria (which can include XP/level thresholds) are
   evaluated next.
7. `checkAndAwardAchievements(child)`.
8. Final `child.save()`.

## 3. API contracts

All responses use the standard envelope: `{ success, data, meta? }` on
success, `{ success: false, error: { code, message } }` on failure.

### 3.1 Child-facing

| Method & Path | Purpose | Notable response fields |
|---|---|---|
| `GET /api/v1/daily-challenge?childId=` | Today's challenge + this child's progress | `challenge: null` when nothing is scheduled (not an error) |
| `GET /api/v1/achievements/catalog?childId=` | Every published achievement, flagged `earned: boolean` | No "locked" concept -- achievements are earned-or-not, never prerequisites |
| `GET /api/v1/achievements/earned?childId=` | Just what this child has earned | Sorted newest-first |
| `GET /api/v1/avatars?childId=` | Character catalog + colors + cosmetics | Each cosmetic has `unlocked: boolean` when `childId` is supplied, omitted otherwise |
| `GET /api/v1/regions?childId=` | Regions sorted by `unlockOrder` | Each region has `unlocked: boolean` |
| `GET /api/v1/games?childId=` | Published games | Each has `unlocked`, `bestStars` |
| `POST /api/v1/games/:id/complete` | Completes a game session | Returns `session`, `child` (totalXP/currentLevel/currentStreak), `newlyEarnedAchievements[]`, `dailyChallenge` progress |
| `POST /api/v1/recipes/:id/complete-cooking` | Completes a cooking session | Same shape as above; `pendingParentVerification` flag |
| `POST /api/v1/nutrition-lessons/:id/complete` | Completes a lesson (with optional quiz answers) | `passed`, `quizResult` (correct/total, never the answer key), `xpEarned` |

### 3.2 Admin (all under `/api/v1/admin/*`, `authorize(platform_admin)`)

Every content type below exposes the identical 6-endpoint shape via the
shared factory:

```
GET    /admin/<type>              list (paginate, filter by status/search)
GET    /admin/<type>/:id          get one
POST   /admin/<type>               create (always starts "draft")
PATCH  /admin/<type>/:id           edit content fields (bumps version)
POST   /admin/<type>/:id/status    workflow transition
DELETE /admin/<type>/:id           delete (draft-only)
```

`<type>` in `{games, recipes, regions, nutrition/lessons,
nutrition/food-facts, achievements, daily-challenges, avatar-cosmetics}`.
`regions` additionally exposes `GET /admin/regions/:id/content` (derived
read of assigned games/recipes).

## 4. Database interactions

| Collection | Written by | Read by |
|---|---|---|
| `XPTransaction` | Only `gamification.service.awardXp` | Dashboard activity feed, `nutritionLesson.service` (counts prior completions for replay-XP logic) |
| `ChildAchievement` | Only `achievementEngine.service` | `achievement.controller` (catalog/earned endpoints) |
| `ChildChallengeProgress` | Only `dailyChallenge.service` | Same service's own read path |
| `ChildProfile` (`totalXP`, `currentLevel`, `currentStreak`, `longestStreak`, `lastActivityDate`, `badges[]`, `progressStats`) | `gamification.service`, `achievementEngine.service` (badges only), completion services (progressStats only) | `unlockRuleEngine` (the primary read path -- nearly every rule type reads one of these fields) |
| `Game` / `Recipe` / `Region` / `AvatarCosmetic` / `Achievement` / `DailyChallenge` (`unlockRequirements` / `unlockCriteria`) | Admin CRUD only | `unlockRuleEngine.evaluateUnlockRule` |

No collection here is ever queried with a Mongo aggregation pipeline for
gamification logic -- everything is plain `find`/`countDocuments` plus
in-application reduction, consistent with the rest of this codebase's
choice to avoid operators the sandbox's in-memory test model doesn't
implement, and entirely reasonable at current data volume.

## 5. Edge cases (handled, and how)

- **Multiple activities in one day** -> streak increments once, not per
  activity (`updateStreak`'s same-day check).
- **A missed day** -> streak resets to 1, not 0 (today's activity is the
  first day of a *new* streak) -- `streakBroken: true` is still reported
  so the caller can distinguish "brand new streak" from "continuing."
- **Timezone edge**: a family in `America/Los_Angeles` completing
  something at 11pm local time must not have it register as "tomorrow"
  just because it's already past midnight UTC -- handled by computing
  calendar-day keys via `Intl.DateTimeFormat` in the family's own IANA
  timezone, never comparing raw UTC timestamps.
- **Missing/invalid timezone** -> falls back to `"UTC"` rather than
  throwing; a data-hygiene gap shouldn't break a completion flow.
- **Replay farming** -> replays earn sharply reduced XP
  (`REPLAY_XP_RATIO`), and games additionally enforce a rolling
  daily cap on XP-earning completions (`dailyCapReached` in the response).
- **Double-completion / double-verification** -> both game sessions and
  recipe parent-verification are idempotent by construction (a second
  call is a documented no-op, never a double payout).
- **Achievement re-earning** -> `ChildAchievement` has a unique compound
  index on `(child, achievement)` -- even if `checkAndAwardAchievements`
  were somehow called twice concurrently for the same child, the second
  insert fails at the database level rather than double-paying.
- **Streak milestone twice** -> intentional: a 7-day milestone bonus fires
  again after a reset and a fresh climb back to 7, since it's being
  re-earned, not a lifetime achievement (that's what the Achievement
  system -- a separate, once-only mechanism -- is for).
- **Daily challenge scheduling overlap** (an admin data-hygiene mistake,
  two published challenges both covering today) -> the earliest-created
  one wins, deterministically, rather than randomly picking.
- **No challenge scheduled** -> `getChallengeStatus` returns
  `{ challenge: null, progress: null }`, never a fabricated placeholder.
- **Unknown/malformed unlock rule type** -> fails closed (treated as
  locked), never silently unlocks content.
- **Client-supplied XP or status** -> structurally impossible: `awardXp`
  takes a server-computed `amount` and there is no endpoint that accepts
  an XP amount from the request body; admin content creation always
  forces `status: "draft"` regardless of what's in the payload.
- **Quiz answer-key leakage** (nutrition lessons, same as games) -> the
  correct answer is stripped before the lesson is ever sent to a child;
  scoring happens server-side against the real stored answers.

## 6. Tests

`tests/gamification.test.js` (25 tests) covers: level-formula correctness
and floor-at-1 behavior; same-day/next-day/missed-day streak transitions;
timezone-aware day-boundary correctness at a UTC boundary a naive check
would get wrong; invalid-timezone fallback; the XPTransaction-is-the-only-
path invariant; perfect-score bonus as a separate transaction; each of the
four achievement trigger styles (first-of-kind, streak-based, count-based,
quiz-gated); nutrition lesson completion with and without an embedded
quiz, including answer-key non-leakage and reduced replay XP; and daily
challenge empty-state, progress-tracking, completion-XP-exactly-once, and
type-specificity (a challenge scoped to one game doesn't match a
different game).

`tests/avatarCosmetics.test.js` (3 tests, added this session) covers the
one gap that existed before this session: per-child unlocked/locked
annotation on published cosmetics, draft cosmetics never appearing, the
no-childId case omitting the flag entirely, and the admin create ->
review -> publish workflow for cosmetics specifically.

Combined with the rest of the suite (games, recipes, regions, admin CRUD,
auth, etc.), the full backend test suite is **94/94 passing**.

## 7. What was found and fixed this session

1. **Duplicated timezone-lookup logic**: `nutritionLesson.service.js` had
   reimplemented its own local `getFamilyTimezone` instead of importing
   the existing shared `utils/familyTimezone.js` (used by `game.service.js`
   and `recipe.service.js`). Fixed to use the shared implementation --
   the exact kind of drift risk centralization is meant to prevent.
2. **Avatar cosmetics unlocking** was the one genuinely unbuilt piece of
   the "Unlocking" requirement -- built `AvatarCosmetic` as a proper
   admin-manageable content type (same audit fields, same workflow, same
   admin CRUD factory as everything else), wired per-child unlock
   annotation into the avatar catalog endpoint via the existing
   `unlockRuleEngine`, and added admin CRUD + tests for it.
3. A real bug caught by writing tests rather than assuming: the in-memory
   test model's query objects only implement `.then`, not the full
   Promise interface -- `.catch()` chained directly on a query broke with
   a 500. Fixed by awaiting inside a `try/catch` instead, which is also
   the more broadly portable pattern (works identically against real
   Mongoose queries and the test fake).
