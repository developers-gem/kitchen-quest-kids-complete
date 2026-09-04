# Kitchen Quest Kids — Complete Testing Strategy

Covers all three clients (Node/Express API, React web, Flutter mobile)
and cuts across them for security and user-acceptance testing. Every
section below states plainly what's automated-and-passing today versus
what's a documented plan for not-yet-built features -- nothing here
claims coverage that doesn't exist.

---

## 1. Backend Testing

**Status: 106/106 tests passing** (`kitchen-quest-api/tests/`, run with
`npm test`). No real MongoDB is available in the build sandbox, so every
model is swapped for a hand-rolled in-memory fake at test time (see
`tests/mocks/` and `jest.config.js`'s `moduleNameMapper`) that implements
the real Mongoose query surface (`find`, `findOne`, `findById`,
`findOneAndUpdate`, `deleteOne`, `countDocuments`, unique-field
enforcement, `$ne`/`$regex` filters). This exercises the full
routes -> middleware -> controllers -> services stack end-to-end against
a real Express app via `supertest`, not mocked at the HTTP layer.

| Requirement | File(s) | What's covered |
|---|---|---|
| Authentication | `auth.test.js` | Register, login, refresh rotation + reuse detection, logout, forgot/reset password (no email enumeration), parental gate challenge/verify |
| Authorization | `admin.test.js`, `games.test.js` | Role-gated admin routes (401 unauthenticated, 403 non-admin, 200 admin); games/recipes reject acting on a child not owned by the caller |
| Child profile ownership | `children.test.js` | 404 (not 403) on another family's child; parental-gate requirement on create/update/delete; soft-delete |
| Family access | `children.test.js`, `parentDashboard.test.js` | Cross-family child access rejected; dashboard scoped to the caller's own family |
| Game completion | `games.test.js` | Full session lifecycle, server-side scoring (client score ignored), idempotent completion |
| XP calculation | `gamification.test.js` | Level-formula correctness, XPTransaction-is-the-only-path invariant, perfect-score bonus as a separate transaction |
| Duplicate reward prevention | `games.test.js`, `recipes.test.js`, `gamification.test.js` | Double-complete a session, double-verify a recipe, and the `ChildAchievement` unique index -- all rejected/no-op'd, never double-paid |
| Recipe progress | `recipes.test.js` | Start -> advance -> complete -> (optional) parent-verify, pause/resume, reject-if-steps-incomplete |
| Grocery generation | `recipes.test.js` | Merges ingredients across multiple recipes by (name, unit); custom items; check/uncheck |
| Achievement unlocking | `gamification.test.js`, `avatarCosmetics.test.js` | First-of-kind, streak-based, count-based, and quiz-gated triggers; the same rule engine also gates avatar cosmetics |
| Streak calculations | `gamification.test.js` | Same-day no-op, next-day increment, missed-day reset-to-1, timezone-aware day boundaries, invalid-timezone fallback |

**Additional coverage beyond the checklist** (found while building the
gamification and admin systems): admin content workflow (draft -> review
-> published -> archived, with illegal transitions rejected), version
bumping on edits but not pure status changes, draft-only deletion,
daily-challenge idempotency, and the full `security.test.js` suite (see
Section 4).

---

## 2. Web Testing

**Status: 12/12 tests passing** (`kitchen-quest-web/`, run with
`npm test`). Vitest + React Testing Library, newly set up this session
(no test infrastructure existed before). Tests mock only at the `api/*.ts`
module boundary -- the same boundary the app's own architecture already
draws between components and network calls -- so real component logic,
real Context providers, and real React Query caching are exercised.

| Requirement | Status | Notes |
|---|---|---|
| Login flow | **Automated, 4 tests** | Render, successful login + redirect, error-shown-on-rejection, submit-button disabled while in flight |
| Child switching | **Automated, 4 tests** | Default-to-first-child, switching, localStorage persistence keyed by user id, fallback when the persisted child was deleted |
| Game flow | **Not yet buildable** | The Games section is still a `ComingSoonScreen` placeholder in the app itself (see `routes/router.tsx`) -- there is no real flow to test yet. Plan: once built, test game listing, launch, in-progress scoring UI, and completion/reward screen, mocking `api/games.ts`. |
| Recipe flow | **Not yet buildable** | Same situation -- placeholder route. Plan: recipe browsing, cook-mode step-through, parent-verification prompt. |
| Grocery flow | **Not yet buildable** | Same situation. Plan: list rendering, check/uncheck, offline banner + queued-toggle indicator once the offline sync UI is built. |
| Parent dashboard | **Partially automated, 4 tests** | The Home Dashboard (child header, XP/level/streak display, progress stats, honest empty states for featured games/recipes and the daily challenge) is real and tested. The fuller multi-tab Parent Dashboard (weekly summary, achievements, settings) is itself a placeholder route -- plan: test each tab's data-fetch-and-render once built, plus the parental-gate modal gating access to it. |

**Why "not yet buildable" instead of skipped silently**: writing tests
against a placeholder screen would either test meaningless static text or
require inventing a fake implementation to test against -- neither is
real coverage. The router structure already has the exact path reserved
for each of these, so adding their tests is additive, not a rewrite,
once the corresponding phase is built.

---

## 3. Flutter Testing

**Status:** test infrastructure and initial suite added this session
(`kitchen_quest_mobile/test/`). **Not run** -- no Flutter SDK is available
in this sandbox (confirmed unavailable across this entire project's
build). Every test file was hand-verified against the actual source
(exact method signatures read from each file before its fake was
written) and passed brace-balance/duplicate-symbol/import-resolution
scans, but that is not equivalent to `flutter test` actually passing.
Run `flutter test` in a real environment as the immediate next step.

| Requirement | Status | Notes |
|---|---|---|
| API services | **Written, unrun** | `test/services/token_store_test.dart` -- the object every request interceptor reads |
| Authentication | **Written, unrun** | `test/features/auth/auth_controller_test.dart` -- silent-login bootstrap (no token / valid token / expired token), login success/error, logout-clears-session-even-on-server-failure |
| Navigation | **Not yet written** | `app_router.dart`'s auth-gated redirect and splash-during-bootstrap logic need a `WidgetTester`-based test driving `MaterialApp.router` with `ProviderScope` overrides -- more involved than a plain unit test and was not reached this session |
| State management | **Written, unrun** | Covered by the auth and child-switching tests above -- both exercise real Riverpod `AsyncNotifier`/`Notifier` classes via `ProviderContainer`, not reimplemented logic |
| Child switching | **Written, unrun** | `test/features/child_profiles/active_child_controller_test.dart` -- default selection, switching, SharedPreferences persistence, fallback-when-deleted, empty-family case |
| Grocery offline behavior | **Written, unrun (mechanism only)** | The grocery *screen* is a later phase, but `OfflineCacheService` (the caching + pending-toggle-queue mechanism it will use) is already built and tested: cache round-trip, overwrite-not-merge on refresh, queue accumulation, last-write-wins per item, and full-queue clear on sync |

---

## 4. Security Testing

**Status: 12/12 tests passing**, `kitchen-quest-api/tests/security.test.js`
(new this session; general authz/ownership security properties were
already covered incidentally by the functional suites listed in Section 1).

| Requirement | Covered by |
|---|---|
| Unauthorized access | No `Authorization` header -> 401; malformed header (missing `Bearer`) -> 401; syntactically invalid token -> 401 |
| Parent accessing another family's child | `children.test.js`, `parentDashboard.test.js`, `games.test.js` -- 404, never 403 (doesn't confirm the child *exists* to an unauthorized caller) |
| Token expiration | A **genuinely expired, correctly-signed** JWT (crafted with `expiresIn: -10`) -> 401 -- distinct from "malformed," since a well-formed-but-expired token is the case that actually matters in production; also covers a token signed with the wrong secret (forged-token attempt) and a token for a user id that no longer exists |
| Invalid input | NoSQL-operator-injection payload (`{ "$gt": "" }` as a field value) rejected by zod validation before reaching the database; an oversized field rejected rather than silently truncated |
| Rate limiting | The real `express-rate-limit` mechanism (via the same `makeLimiter` factory production code uses) verified to return `429` with the standard error envelope past its configured max; a config-level assertion that the auth-specific limit is stricter than the global default |
| Injection attempts | NoSQL operator injection (above); an ObjectId-shaped-injection attempt on a route param rejected by ID validation; script-tag-like input verified to be stored/returned as inert literal text (never executed, never silently stripped -- output-side escaping is the web client's job, which React provides by default) |

**A note on the rate-limiting test's design**: the main suite deliberately
raises `AUTH_RATE_LIMIT_MAX` in `tests/setup.js` so the hundred-plus other
requests across the full test run don't spuriously trip it. The security
test therefore builds a small standalone Express app from the exact same
`makeLimiter` factory with a low max, testing the real mechanism without
fighting that suite-wide override.

---

## 5. User Acceptance Testing

Each scenario is written as steps a real person follows, with an
explicit expected result. These are meant to be run by hand (or turned
into Cypress/Detox/integration-test scripts later) against a running
staging environment with seeded content.

### Parent scenarios

**UAT-P1: Register a new family account**
1. Open the app, tap "Create a parent account."
2. Enter first name, last name, email, a password meeting the strength
   requirement, and check the consent acknowledgment.
3. Submit.
- *Expected:* Account created, immediately logged in, landed on a "no
  chefs yet" empty state (no children exist yet). A confirmation/
  verification email is sent (not blocking further use).

**UAT-P2: Create two children**
1. From the empty state (or Parent settings), tap "Add a chef."
2. Complete the parental gate (arithmetic challenge).
3. Enter a display name and age range for child 1, choose an avatar,
   save.
4. Repeat for child 2 with a different name/age range/avatar.
- *Expected:* Both children appear in the child switcher; each has their
  own independent XP/level/streak starting at zero.

**UAT-P3: Switch between child profiles**
1. With two children created, tap the second child's tab in the switcher.
- *Expected:* The dashboard immediately reflects the second child's own
  name, level, XP, and progress -- no data from the first child leaks in.
  Switching back shows the first child's state exactly as it was left.

**UAT-P4: Track a child's progress**
1. As child 1 completes a game or recipe (see child scenarios below),
   return to the parent-facing dashboard/progress view.
- *Expected:* Games/recipes completed counts, XP, level, and streak all
  reflect the just-completed activity without requiring a manual refresh
  beyond normal navigation.

### Child scenarios

**UAT-C1: Play a game**
1. From the active child's home screen, choose an unlocked game and start
   it.
2. Play through to completion.
- *Expected:* A results screen shows stars earned and XP awarded; the
  game's XP amount, degraded by performance, matches what the star count
  implies (e.g. 3 stars = closer to full XP than 1 star).

**UAT-C2: Earn XP and level up**
1. Complete enough games/recipes to cross a level threshold (100 XP per
   level in the current formula).
- *Expected:* A level-up moment is visible (even if simple); the
  dashboard's level indicator updates to the new level immediately.

**UAT-C3: Unlock content via progression**
1. Before reaching the required level/streak/completion count, confirm a
   gated game/recipe/region shows a locked state and cannot be started.
2. Reach the threshold (level up, hit a streak, or complete the
   prerequisite content).
3. Return to the previously-locked item.
- *Expected:* It now shows unlocked and can be started, with no app
  restart or manual refresh required beyond normal navigation.

**UAT-C4: Complete a recipe**
1. Choose a recipe, start cooking, step through every step to the end.
2. If the recipe requires parent verification, confirm XP is *not* yet
   awarded and a "waiting for a grown-up" state is shown.
3. As the parent, verify the completion (parental gate + confirm).
- *Expected:* XP is awarded exactly once, at verification time (or
  immediately at completion for recipes that don't require it) -- never
  both, never neither.

### Grocery scenarios

**UAT-G1: Select recipes and generate a list**
1. From a recipe's detail page, tap "Add to grocery list" for two
   different recipes that share at least one ingredient.
- *Expected:* The grocery list shows the shared ingredient once, with
  quantities combined, not duplicated as two separate lines.

**UAT-G2: Check items off the list**
1. Open the grocery list, tap several items to mark them checked.
2. Close and reopen the app.
- *Expected:* Checked state persists across the app restart (it's server
  state, re-fetched on load).

**UAT-G3 (mobile, once built): Offline behavior**
1. Turn off network connectivity.
2. Check/uncheck a few items.
3. Restore connectivity.
- *Expected:* Toggles made offline are visibly queued (not silently lost
  or falsely shown as synced), and are sent to the server once
  connectivity returns, converging to the same state a parent would see
  on the web app.

---

## 6. Full QA Checklist

Use before any release. Each line should be a pass/fail, not a
"probably fine."

### Accounts & access
- [ ] Register with valid data succeeds; with missing consent fails
- [ ] Login with correct/incorrect credentials both behave correctly (no
      information leakage on which was wrong)
- [ ] Logout clears the session on this device only
- [ ] Password reset flow works end-to-end, including an invalid/expired
      reset link being rejected
- [ ] A parent cannot see or act on another family's data anywhere in
      the app (children, grocery, dashboard, recipes-in-progress)
- [ ] Every sensitive parent action (create/edit/delete a child, view the
      parent dashboard) requires the parental gate, every time a fresh
      gate token is needed

### Core gameplay loop
- [ ] Every published game is playable start-to-finish on at least one
      device size
- [ ] Star rating and XP awarded are consistent with in-game performance
- [ ] Replaying a game awards reduced XP and respects the daily cap
- [ ] Every published recipe's steps render correctly in both child mode
      (simplified) and parent mode (full detail)
- [ ] A recipe requiring parent verification correctly withholds XP until
      verified
- [ ] Streaks increment once per day regardless of how many activities
      are completed that day, and reset (to 1, not 0) after a missed day
- [ ] Achievements fire at the correct threshold, exactly once, with the
      correct XP

### Content & unlocking
- [ ] Locked games/recipes/regions/cosmetics are visibly locked and
      cannot be started/equipped
- [ ] Content becomes unlocked immediately upon meeting its criteria, no
      stale cache showing it as still locked
- [ ] Draft/review-status content never appears on any child-facing
      screen
- [ ] Admin can move content through the full draft -> review ->
      published -> archived lifecycle without error

### Grocery
- [ ] Adding a recipe's ingredients merges correctly with an existing
      list
- [ ] Custom (non-recipe) items can be added and removed
- [ ] Checked state persists across sessions

### Cross-platform consistency
- [ ] The same family's data (children, progress, grocery list) is
      consistent whether viewed on web or mobile
- [ ] A child switch on one device doesn't affect the active child shown
      on a different device/session

### Accessibility & UX
- [ ] All interactive elements meet the 44px minimum touch target
- [ ] `prefers-reduced-motion` is respected for reward animations on both
      web and mobile
- [ ] Every screen has a real loading state and a real error state (no
      blank screens on slow/failed requests)
- [ ] Every empty state (no children, no games, no daily challenge) shows
      honest copy, never fabricated placeholder content

### Security
- [ ] Rate limiting is active on auth endpoints in the deployed
      environment (verify the real config, not just the test's small-max
      mechanism check)
- [ ] No secrets, tokens, or internal error details leak into any
      client-facing error message
- [ ] HTTPS is enforced in staging/production
- [ ] Dependency audit (`npm audit`, Flutter's `pub outdated`) shows no
      unaddressed high/critical vulnerabilities

---

## 7. Critical Edge Cases

Consolidated from every system built so far (gamification, admin content,
auth, grocery). Each is either automated-and-passing (marked DONE) or a
documented risk for a not-yet-built feature (marked PLANNED).

| Edge case | Status | Handling |
|---|---|---|
| Multiple activities in one calendar day | DONE | Streak increments once, not per activity |
| A missed day | DONE | Streak resets to 1 (not 0); `streakBroken` flag distinguishes this from a fresh first-ever streak |
| Family timezone at a UTC day boundary | DONE | Day-boundary computed via `Intl.DateTimeFormat` in the family's own IANA timezone, not raw UTC comparison |
| Missing/invalid timezone data | DONE | Falls back to UTC rather than throwing |
| Replay XP farming | DONE | Sharply reduced replay XP + a rolling daily cap on XP-earning game completions |
| Double-completing a game/recipe session | DONE | Idempotent by construction; second call is a documented no-op |
| Double-verifying a recipe | DONE | Same idempotency; XP paid exactly once |
| Concurrent achievement award race | DONE | Unique compound index on `(child, achievement)` enforces it at the database level even if application logic somehow ran twice |
| Streak milestone bonus re-triggering after a reset | DONE | Intentional -- it's a repeatable bonus, not a lifetime achievement |
| Two admin-scheduled daily challenges overlapping the same date | DONE | Earliest-created wins, deterministically |
| No daily challenge scheduled for today | DONE | Honest `null`, never a fabricated placeholder |
| Unknown/malformed unlock rule type | DONE | Fails closed (locked), never silently unlocks |
| Client attempting to supply its own XP amount or content status | DONE | Structurally impossible -- no endpoint accepts a client-supplied XP amount; admin creation always forces `status: "draft"` |
| Quiz/game answer-key leakage to the child client | DONE | Stripped server-side before delivery, for both games and nutrition lesson quizzes |
| NoSQL injection via request body/query | DONE | Rejected by zod validation before reaching the database layer |
| Expired vs. malformed vs. forged access token | DONE | All three distinctly tested and rejected |
| A child profile deleted while it was the "active" selection (web/mobile) | DONE | Falls back to the first remaining child rather than showing a broken/blank active child |
| Switching parent accounts on a shared browser/device | DONE | Active-child selection is persisted keyed by user id, so account B never inherits account A's selection |
| Recipe/game assigned to a region that is later archived | PLANNED | Not yet explicitly tested -- the admin "assigned content" view would still show it, but child-facing visibility should be re-verified to confirm an archived region correctly hides its games/recipes from the Flavor Hub even if the individual game/recipe itself is still "published" |
| Grocery item toggled offline on two different devices before either syncs | PLANNED | The offline queue is last-write-wins *per item, per device*; a genuine cross-device conflict (same item toggled differently on phone and web while both were offline) isn't yet resolved by any documented rule -- worth defining once the mobile grocery screen exists |
| Achievement `unlockCriteria` referencing a game/recipe that is later deleted | PLANNED | The admin service only allows deleting draft content, which limits exposure, but a rule referencing an archived (not deleted) game/recipe id should be verified to fail gracefully rather than erroring the whole achievement check |
| Very large families (many children) or very long-lived accounts (years of XPTransaction history) | PLANNED | No pagination limit currently caps dashboard/history queries against these collections -- fine at current scale, worth revisiting before it isn't |
| Push notification token registered under one parent account, device later used to log into a different family | PLANNED | `PushNotificationService` documents the intent to re-register on every login, but this isn't automated-tested since the backend endpoint it targets doesn't exist yet (Notifications is a later phase) |
