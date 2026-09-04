# Kitchen Quest Kids — What Has NOT Been Done

A fresh investigation pass across all three codebases (backend, web,
Flutter), run specifically to find gaps — not a recap of what's already
built. Every item below was verified against the actual code just now
(grep'd and read), not recalled from memory. Split into **newly
discovered** findings (not in any earlier report) and **previously
documented, still open** findings, so nothing is double-counted or lost.

---

## Newly discovered this pass

### 1. Recipe → Grocery integration has no UI on either client — **FIXED on web and Flutter this session**
The backend has a complete endpoint
(`POST /recipes/:id/add-to-grocery-list`), and the web app's API client
already had a working function for it
(`kitchen-quest-web/src/api/recipes.ts`'s `addRecipeToGroceryList`) —
but no page called it. Added an "Add ingredients to grocery list" button
to `RecipeDetailPage`, wired to the existing function, updating the same
React Query cache entry (`GROCERY_QUERY_KEY`, now exported from
`api/grocery.ts` so both pages share one source of truth instead of each
declaring their own copy of the key) so `GroceryListPage` reflects the
addition immediately without a refetch. Confirmed success and error
states both render correctly, and the locked-recipe case correctly
never shows the button. Ported the same fix to Flutter: added
`RecipeRepository.addToGroceryList` and the matching button on
`RecipeDetailScreen`. **Severity: HIGH → RESOLVED (both platforms)**.

### 2. Admin panel is missing editors for 2 of 8 content types — **FIXED this session**
The backend has admin CRUD modules for all 8 content types (`games`,
`recipes`, `regions`, `nutrition`, `achievements`, `dailyChallenges`,
`avatarCosmetics`, plus the dashboard). The web admin UI now has editor
pages for all 8 -- built `AdminDailyChallengesListPage`/
`AdminDailyChallengeEditorPage` and `AdminAvatarCosmeticsListPage`/
`AdminAvatarCosmeticEditorPage`, following the same generic
`createAdminApi`/`AdminContentListPage`/`WorkflowActions` pattern the
other 6 types already use. Both wired into the router and the admin nav
sidebar. **A real bug was found and fixed while building these**: the
shared `JsonField` component (used by achievements, games, regions,
nutrition lessons, and now these two) initialized its internal textarea
text once from the `value` prop and never re-synced -- so opening an
*existing* record to edit it displayed the wrong starting JSON (a blank
default) instead of the actual saved value, until the admin manually
retyped it. Not just cosmetic: an admin editing relative to what was
displayed could unknowingly overwrite a real unlock rule. Fixed in the
shared component (one fix benefits all 6+ editors that use it), with a
dedicated regression test suite (`JsonField.test.tsx`) proving the fix
without breaking the user's own in-progress typing. **Severity: HIGH →
RESOLVED**.

### 3. Flutter has no Flavor Hub / Regions feature at all — **FIXED this session**
Not a placeholder, not an empty folder with a README like every other
unbuilt Flutter feature — there was **no `features/regions` (or
equivalent) directory, no route, no nav destination** for browsing
regions on mobile. Web has a complete, tested Flavor Hub. Built
`FlavorHubScreen` (region grid) and `RegionDetailScreen` (per-region
game listing), against the same `region.service.js` contract the web
client already uses, verified against source again rather than
re-derived from the web client's own types. Also added the one thing
missing to make it reachable at all: a banner on `HomeDashboardScreen`
linking to it, since nothing on mobile pointed at this screen before it
existed. **Severity: MEDIUM → RESOLVED**.

### 4. New game-flow components lack their own unit tests — **FIXED this session**
`GameFlow.tsx` is still only exercised indirectly through
`GamePlayPage`'s integration tests (its logic is thin orchestration, not
independently risky). `QuizPlayer` and `MatchingPlayer` now each have
dedicated unit test suites covering their own interaction logic in
isolation: question-to-question navigation and the exact submitted
payload shape for quiz; connect/disconnect-by-re-tap/disconnect-by-
tapping-a-used-match and the Finish-button gating logic for matching,
plus a regression guard proving the shuffled match column never mirrors
the prompt column's order (the property the whole game's fairness
depends on). **Severity: LOW → RESOLVED**.

### 5. Flutter's Notifications and Settings folders are still completely empty
Confirmed by direct file count: `features/notifications/` and
`features/settings/` each contain exactly one file — the placeholder
README. This was known qualitatively but hadn't been stated this
concretely before. **Severity: MEDIUM** (Settings, since account
management on mobile has no home at all) **/ LOW** (Notifications, since
push isn't wired to a real Firebase project yet anyway — see below).

---

## Previously documented, confirmed still open

Re-verified against the current code rather than assumed carried-over:

| Gap | Verified status |
|---|---|
| Real email delivery (SES/Postmark/SendGrid) | Still stubbed — `email.service.js`'s `sendEmail` only `console.log`s. The broken *link* was fixed this session; a real provider was never wired. |
| Analytics | Still doesn't exist anywhere in the backend (`find ... -iname "*analytic*"` → zero results). |
| Real Notifications system | Still no backend `Notification` model, no delivery endpoint, no `push-tokens` route. Mobile's `PushNotificationService` still architecture-only, no real Firebase project. |
| 7 of 9 game types unplayable (web) | Confirmed: `SUPPORTED_GAME_TYPES = ["quiz", "matching"]`. Sorting, memory, sequence, dragAndDrop, maze, ingredientBuilder, timedChallenge remain "not playable here yet." |
| 8 of 9 game types unplayable (Flutter) | Confirmed: `_supportedGameTypes = {'quiz'}` only — Flutter is now one game type behind web. |
| Flutter has no `android`/`ios` native folders | Still true — `flutter create .` has never been run; the app cannot currently be built on a device or emulator. |
| Docker builds unverified | Both Dockerfiles (API, web) still unbuilt — no Docker daemon exists in this sandbox. |
| CI has never actually executed | The GitHub Actions workflows exist and are believed correct but have never run against a real GitHub repo from this sandbox. |
| Backup/restore procedure undemonstrated | Documented with real `mongodump`/`mongorestore` commands, never run against a live database. |
| Moderate `npm audit` finding (`qs` via `express`) | Still open — `npm audit fix` doesn't resolve it without a Express major-version bump; confirmed non-blocking for CI's `--audit-level=high` gate. |
| No real image/file upload | Confirmed — avatar assets are admin-curated by design (`avatar.model.js`'s own doc comment: "never user-uploaded"), but there's genuinely no upload flow for any admin content image anywhere in the system. |
| No real accessibility testing | Code-level a11y patterns (focus rings, touch targets, ARIA labels) are in place on both clients; neither has been tested with an actual screen reader. |
| A few small edge cases from the original audit | Still open, unchanged: archived-region content visibility, cross-device offline grocery conflicts, an achievement rule referencing later-archived content. |

---

## What this changes about priorities

All five originally-found items are now resolved (see the "FIXED" tags
throughout this document). The four new findings below are what's
actionable next.

## Fresh investigation pass (second round)

Run after the first round's five findings were resolved, specifically
looking for what those fixes might have introduced or left unfinished,
and for anything the original pass missed. All four are new, verified
against current code.

### 6. Daily Challenge admin form can silently create a challenge that never works — **FIXED this session**
`adminDailyChallenges.validation.js`'s `targetSchema` made `gameId` and
`recipeId` both fully optional regardless of `challengeType`. Traced the
runtime consequence in `dailyChallenge.service.js`'s matching logic:
`String(event.gameId) === String(challenge.target.gameId)` becomes
`=== "undefined"` when the field was never set, which never equals a
real id — the challenge published successfully and silently never
awarded progress to any child, forever. Added a `superRefine` cross-field
check requiring the matching id for `completeSpecificGame`/
`completeSpecificRecipe`, applied to both the create schema and a
correctly-reapplied version for the `.partial()` update schema (a
`ZodEffects` from `superRefine` has no `.partial()` method, so the
refinement has to run on the base object schema first, then be
reapplied). 5 backend tests plus 1 frontend test confirming
`AdminDailyChallengeEditorPage` actually surfaces the rejection instead
of failing silently. **Severity: MEDIUM → RESOLVED**.

### 7. Region detail pages show games as dead-end tiles on both platforms — **FIXED this session**
Checked `RegionDetailPage.tsx` (web) and `RegionDetailScreen` (Flutter)
directly: the list of games within a region rendered as plain
non-interactive tiles with no navigation to actually play any of them.
Fixed both to link to the real `/games/:slug` destination (`Link` on
web, `InkWell` + `context.push` on Flutter) — that destination already
correctly handles a locked game on its own, so this list doesn't need to
duplicate any unlock-checking logic. Added a web test asserting the
correct `href`. **Severity: MEDIUM → RESOLVED**.

### 8. MatchingPlayer has no ARIA state on its interactive buttons — **FIXED this session**
`QuizPlayer.tsx` correctly used `role="radio"`/`aria-checked`;
`MatchingPlayer.tsx` had zero ARIA attributes anywhere. Added
`aria-pressed` and a descriptive `aria-label` ("Apple, connected -- tap
to disconnect") to both the prompt and match buttons, plus a visual
checkmark for sighted users. All 6 existing `MatchingPlayer` tests still
pass unchanged. **Severity: MEDIUM → RESOLVED**.

### 9. "Manage children" has no persistent nav entry (web) — **FIXED this session**
Added a "Manage Children" entry to `AppLayout.tsx`'s persistent
`NAV_ITEMS`, alongside Home/Flavor Hub/Games/Recipes/Grocery/Parent
Dashboard, so adding or editing a child is one click from anywhere in
the app rather than only reachable via a disappearing empty-state button
or a link buried in Parent Dashboard settings. **Severity: LOW–MEDIUM →
RESOLVED**.

### A flaky test found and fixed while verifying the above
Running the full suite multiple times (not just once) surfaced a real,
reproducible ~1-in-3 flake in `AdminAvatarCosmeticEditorPage.test.tsx`:
a synchronous assertion checked `JsonField`'s displayed value
immediately after a `waitFor` on a *different* field, racing against
`JsonField`'s own value-prop re-sync effect (the same effect added
earlier this session to fix the stale-JSON bug) landing in a later
render pass. Fixed by bundling all three related assertions into one
`waitFor`, matching the pattern already used to fix similar races
elsewhere in this project. Confirmed clean across 5 consecutive isolated
runs and 3 consecutive full-suite runs after the fix.
