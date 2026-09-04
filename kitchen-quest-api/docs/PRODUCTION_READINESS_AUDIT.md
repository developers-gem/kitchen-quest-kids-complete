# Kitchen Quest Kids — Production Readiness Audit

## Update: Phase 1 fixes applied (this session)

The following CRITICAL/HIGH findings from the original audit below have
been fixed, tested, and verified (**116/116 backend tests passing**
after all changes):

| Finding | Status | What changed |
|---|---|---|
| B1/B2 (password reset link broken) | **FIXED** | `email.service.js` now links to `FRONTEND_URL` + the real web pages; built the previously-missing `VerifyEmailPage.tsx` on web |
| B3 (health check ignores DB state) | **FIXED** | `utils/healthCheck.js` checks `mongoose.connection.readyState`; mounted at both `/health` and `/api/v1/health`; returns 503 when disconnected |
| D1/I1 (in-memory rate limiter) | **FIXED** | Optional Redis-backed store (`REDIS_URL`), falls back to in-memory when unset -- verified both paths with tests, including that Redis is never even required when unconfigured |
| D2 (no error tracking) | **FIXED** | Optional Sentry integration (`SENTRY_DSN`), no-ops to `console.error` when unset |
| D4/D5 (no graceful shutdown / crash handlers) | **FIXED** | `server.js` now handles `SIGTERM`/`SIGINT` (drain + disconnect DB) and `uncaughtException`/`unhandledRejection` |
| E1 (no DB connection retry) | **FIXED** | Exponential backoff, bounded retries, tested with a mocked `mongoose.connect` |
| E4 (no backup/restore documented) | **FIXED** | `docs/DATABASE_BACKUP_RESTORE.md` -- documented and command-verified, **not yet exercised against a live database** (see that doc's own caveat) |
| A10 (no CI) | **FIXED** | `.github/workflows/ci.yml` -- runs the full test suite, `npm audit`, and a Docker build check on every PR |
| A11 (no Dockerfile) | **FIXED** | `Dockerfile` + `docker-compose.yml` (API + Mongo + Redis) -- **not build-verified**, no Docker daemon is available in this sandbox; syntax and structure follow standard multi-stage patterns but treat this as unverified until built once in a real environment |
| C1 (duplicated `getOwnedChild`) | **FIXED** | Centralized into `utils/getOwnedChild.js`, all six call sites migrated |
| C3/F3 (N+1 admin dashboard queries) | **FIXED** | Single `$in` query replacing per-id `findById` calls, with a new test asserting correct ranking and defensive handling of stale references |
| H2 (region list N+1 game-count query) | **FIXED** | `region.service.js`'s `listRegions()` used to run one `Game.countDocuments` per region; replaced with a single `Game.find()` counted in application code, tested against drafts and regionless games to confirm counts stay correct |
| A4 (Parent Dashboard was a placeholder, web) | **PARTIALLY FIXED** | Built a real, tested, gate-protected `ParentDashboardPage` (Overview, Weekly Summary, Learning Progress, Activity History, Grocery, Settings tabs) against the backend's already-complete `dashboard.service.js` -- Games/Recipes/Grocery sections remain placeholders |
| A4 (Flavor Hub was a placeholder, web) | **FIXED** | Built `FlavorHubPage` (region list, locked/unlocked per active child, reuses the already-built-but-unused `RegionCard` component) and `RegionDetailPage` (per-region game listing), against `region.service.js`'s already-complete contract |
| A4 (Games was a placeholder, web) | **PARTIALLY FIXED** | Built `GamesListPage` (browsing) and two full, tested, real interactive gameplay loops (`GamePlayPage` + `QuizPlayer` for quiz; `GamePlayPage` + `MatchingPlayer` for matching), both sharing a new generic `GameFlow` scaffold extracted from what used to be quiz-specific logic. The other 7 gameTypes (sorting, memory, sequence, dragAndDrop, maze, ingredientBuilder, timedChallenge) still show an honest "not playable here yet" message and never call `startGameSession` for them |
| Missing API response fields (`CompleteGameSessionResponse` type, web) | **FIXED** | The type was missing `newlyEarnedAchievements` and `dailyChallenge`, which the backend's `completeSession` actually returns -- caught while building the results screen that needed them (verified against `achievementEngine.service.js` and `dailyChallenge.service.js`'s real return shapes, not guessed) |
| **Real bug, highest severity found in this whole project**: web onboarding was completely broken | **FIXED** | `HomeDashboardPage`'s empty state linked to `/parent/children/new` -- a route that **never existed** in the router. Any brand-new parent with zero children was silently redirected back to the dashboard by the catch-all route, with no way to ever create a child profile on web. Built the missing `ManageChildrenPage` (create/edit/delete, reusing `AvatarSelector`), fixed the link, and added the route |
| A9/G2 (avatar cosmetics not rendered by either client) | **FIXED on both web and Flutter** | `AvatarCatalog` type/model and `getAvatarCatalog()` were missing `cosmetics` entirely on both clients despite the backend fully supporting it since an earlier session; both `AvatarSelector` implementations now render cosmetics grouped by slot with locked/unlocked states |
| **Real bug found while testing the above**: `AuthContext`'s `isAuthenticated` was a two-step, non-atomic computation | **FIXED** | `isAuthenticated` was `hasToken && Boolean(user)`, and these two pieces of state updated at *different points* in the silent-refresh-on-load flow (a real `await usersApi.getMe()` sits between them). This produced a genuine, reproducible extra render where `hasToken=true` but `user=null` -- which every component gating a data fetch on `isAuthenticated` (nearly every screen in the app) would briefly see as "not authenticated," then "authenticated," causing spurious query re-fetches and, in the worst case observed, a stale button reference from before the flicker landing a click on a detached DOM node. Root-caused via direct instrumentation (timestamped render logs, a stack-traced `setAccessToken`) rather than guessed at. Fixed by making `isAuthenticated` depend on `user` alone, and clearing `user` in lockstep whenever the token is externally invalidated (login/register/logout already set both atomically in the same synchronous function body, so only the silent-refresh path was ever affected) |
| A4 (Recipes was a placeholder, web) | **FIXED** | Built `RecipesListPage`, `RecipeDetailPage`, and a full `CookingModePage` (start/resume → step-by-step → complete → either an immediate XP celebration or an honest "waiting for a grown-up" state when the recipe requires parent verification) |
| **Real backend bug**: `startCooking` crash on resume-after-finishing-all-steps | **FIXED** | Discovered while building `CookingModePage`, not from a separate audit pass: if a child advanced through every step and then navigated away *without* completing or explicitly pausing, re-opening the recipe called `/start` again, which tried to read `recipe.steps[totalSteps]` -- out of bounds -- and would have thrown. Fixed to bounds-check the same way `getCurrentStep` already did, returning `currentStep: null` + `readyToComplete: true`. A regression test reproduces the exact sequence (advance through both steps, re-call `/start`, confirm no crash and the correct state) and a corresponding web test exercises the client-side rendering of that same response shape. |
| API response-shape inconsistency: `verifyCompletion`'s idempotent path | **FIXED** | The "already verified" early-return was missing `newlyEarnedAchievements` entirely, while the first-time-verifying path always included it (even as an empty array) -- a client checking `.length` on that field would have thrown specifically on the idempotent path (e.g. a double-click or a retried request). Now consistent on both paths, with a test asserting the idempotent response shape directly. |
| A4 (Grocery was a placeholder, web) | **FIXED** | Built `GroceryListPage` -- category-grouped items, add/toggle/remove, all against `grocery.service.js`'s already-complete 4-endpoint contract and the already-built-but-unused `GroceryItem` component. **This closes out finding A4 entirely on web**: every child/parent-facing route that was a `ComingSoonPage` placeholder (Flavor Hub, Games, Recipes, Grocery, the full Parent Dashboard) is now a real, tested page. The one remaining, explicitly-flagged gap is that only the "quiz" gameType has a real interactive player (see the Games entry above) -- not a placeholder page, but an honest scope boundary within a real one. |
| Stale bug (`nutritionLessonsCompleted` hardcoded to 0) | **FIXED** | `dashboard.service.js`'s weekly summary was written before the Nutrition Lessons module existed and never updated; now counts distinct lessons via their `XPTransaction` records in the last 7 days, tested end-to-end through the real completion endpoint |
| Stale type (`Region.active` on web) | **FIXED** | The web app's `Region` TypeScript type still had a boolean `active` field from before the backend migrated Region to the same status-workflow every other content type uses -- dead code that would have confused whoever built the Flavor Hub against it; replaced with the fields the API actually returns |
| A10 (no CI, web app half) | **FIXED** | `kitchen-quest-web/.github/workflows/ci.yml` -- type-check, lint, test, build, and dependency audit on every PR (the backend's CI was added in the previous pass) |
| A11 (no deployment manifest, web app half) | **FIXED (unverified build)** | `kitchen-quest-web/Dockerfile` (multi-stage, nginx-served static build) + `nginx.conf` with SPA fallback routing and asset caching -- same caveat as the API's Dockerfile: no Docker daemon available in this sandbox to actually build it |

**Still open from Phase 1**: building the actual Games/Recipes/Grocery
product surfaces on web and Flutter (A4/A5), generating the Flutter
native projects (A6), and a real Notifications system (A2). These are
substantially larger efforts than the fixes above and were not
attempted this session -- see the original Phase 1 list further down,
now annotated with what remains.

---

Scope: backend, database, API, React web app, Flutter mobile app,
authentication, authorization, child profiles, games, recipes, grocery,
parent dashboard, gamification, admin panel, notifications, analytics,
security, performance, accessibility, mobile readiness, deployment
readiness.

Every finding below was verified against the actual codebase (grep'd,
read, or in the backend's case, exercised by the 106-test suite) rather
than assumed. Severity reflects launch impact, not effort to fix.

---

## Executive summary

The backend is the most mature part of this system by a wide margin: 106
passing tests, a genuinely centralized gamification engine, consistent
admin content workflow, and real security middleware already in place
(helmet, CORS allowlist, NoSQL-injection sanitization, rate limiting,
bcrypt, JWT rotation, SameSite=strict cookies). The React web app has
working auth, child management, and a home dashboard, now with real
tests. The Flutter app has a solid architectural foundation (Phase 1-2)
but is the least complete client. **The single most important fact in
this report: email delivery is entirely stubbed (console.log only).**
This silently breaks account verification and password reset for every
real user and must be fixed before any real person can use this product
-- not a polish item, a functional blocker.

Beyond that, the biggest launch risks are: no deployment pipeline exists
at all (no Dockerfile, no CI, no health check that verifies DB
connectivity); Notifications and Analytics are essentially unbuilt;
several client-facing feature areas (Games/Recipes/Grocery/full Parent
Dashboard) are placeholder screens on web and empty folders on mobile;
and the rate limiter's in-memory store will silently stop providing
real protection the moment the API runs on more than one instance.

---

## Findings by category

### A. Missing features

| # | Finding | Area | Severity |
|---|---|---|---|
| A1 | Real email delivery does not exist -- `email.service.js` only `console.log`s. Every "sent" verification/reset email is invisible to the actual user. | Backend, Auth | **CRITICAL** |
| A2 | Notifications system is architecture-only. No backend `Notification` model, no delivery endpoint, no `POST /users/me/push-tokens` the mobile client already expects to call. `User.notificationPreferences` is a schema field with nothing reading or writing it based on real events. | Notifications | **HIGH** |
| A3 | Analytics does not exist anywhere in the system -- no event tracking, no admin analytics beyond the basic "popular content" counts in the admin dashboard. For a children's product this also needs a COPPA-aware design (no third-party trackers, no behavioral profiling of minors), which hasn't been scoped at all yet. | Analytics | **HIGH** |
| A4 | Web app: Games, Recipes, Grocery, and the full multi-tab Parent Dashboard are `ComingSoonPage` placeholders -- not built. | React Web | **CRITICAL** (these are the core product loop) |
| A5 | Flutter app: the same four areas, plus Notifications and Settings, are empty folders with only a README describing the intended structure. Mobile is further behind than web. | Flutter | **CRITICAL** |
| A6 | Flutter has no `android/` or `ios/` native project folders at all -- `flutter create .` has never been run against this codebase. The app cannot currently be built or run on a device or emulator. | Flutter, Mobile Readiness | **CRITICAL** |
| A7 | Runtime achievement-*awarding* wiring for the `ChildAchievement`/badge system is real and tested, but there is no admin UI to browse `ContentAuditLog` (the history the backend already fully records), and no bulk actions (bulk-publish, bulk-archive) in the admin panel. | Admin Panel | MEDIUM |
| A8 | No image/file upload flow anywhere -- `coverImage`, `icon`, `assetKey`, `media` fields are all plain text inputs for a storage key/URL an admin has to obtain some other way. There is no storage service (S3-equivalent) integrated. | Admin Panel, Backend | MEDIUM |
| A9 | Avatar cosmetics unlocking is fully built and tested on the backend + admin, but **neither web nor Flutter actually renders cosmetics or their locked state anywhere** -- a complete feature with zero client consumption. | Web, Mobile, Gamification | MEDIUM |
| A10 | No CI pipeline (GitHub Actions or equivalent) runs any of the three test suites automatically. All 106+12 passing tests only run when a human remembers to run them locally. | Deployment Readiness | HIGH |
| A11 | No Dockerfile, docker-compose, or any deployment manifest exists for the API or the web app. | Deployment Readiness | HIGH |
| A12 | Push notification wiring (`PushNotificationService`) is explicitly documented as architecture-only -- no real Firebase project, no `firebase_options.dart`, no platform config files. This is honestly disclosed in the mobile docs, but it is still a missing feature for launch if push is expected. | Flutter, Notifications | MEDIUM |

### B. Broken integrations

| # | Finding | Area | Severity |
|---|---|---|---|
| B1 | The password-reset email's link points at `/api/v1/auth/reset-password?token=...` -- a raw **API** path, and a **GET** link to an endpoint that only accepts **POST**. Even if real email sending were turned on today, clicking the link would do nothing. The link must point at the **web app's** `/reset-password?token=` page. | Auth, API, Web | **CRITICAL** (masked today only because A1 makes email invisible) |
| B2 | No `FRONTEND_URL`/`WEB_APP_URL` environment variable exists anywhere in the backend config, which is *why* B1 happened -- there's no single source of truth for "where does the web app live" to build links into. | Backend, API | HIGH |
| B3 | The health check (`GET /api/v1/health`) always returns `{status: "ok"}` unconditionally -- it does not check MongoDB connectivity. A load balancer or orchestrator using this as a readiness probe would report the service healthy even while the database is unreachable. | Backend, Deployment Readiness | HIGH |
| B4 | Mobile's `PushNotificationService.registerToken()` calls `POST /users/me/push-tokens`, which does not exist on the backend (404 today, silently swallowed by a try/catch). Honestly documented in the mobile code, but still a real broken integration if assumed to already work. | Flutter, Notifications, API | MEDIUM |

### C. Duplicate logic

| # | Finding | Area | Severity |
|---|---|---|---|
| C1 | `getOwnedChild` (the family-ownership check for a child profile) is copy-pasted verbatim across **six** service files (`dashboard.service.js`, `recipe.service.js`, `region.service.js`, `achievement.controller.js`, `game.service.js`, `nutritionLesson.service.js`). It's a security-relevant check -- a future edit could update five of six copies and miss one. | Backend, Authorization | MEDIUM |
| C2 | (Already found and fixed this session) `nutritionLesson.service.js` had reimplemented its own timezone lookup instead of using the shared `utils/familyTimezone.js`. Listed for the record as resolved, not outstanding. | Backend | Resolved |
| C3 | The admin dashboard's "popular content" computation and the region "assigned content" view both do `Promise.all(ids.map(id => Model.findById(id)))` instead of a single `Model.find({_id: {$in: ids}})` query. Correct today (lists capped at 5), but N queries where one would do. | Backend, Database, Performance | LOW |

### D. Security risks

| # | Finding | Area | Severity |
|---|---|---|---|
| D1 | The rate limiter (`express-rate-limit`) uses the default **in-memory store**. The moment the API runs on more than one process/instance, each instance tracks its own counter -- the effective limit is multiplied by instance count, weakening brute-force protection on login/register. | Security, Scalability | **HIGH** |
| D2 | No structured error/exception tracking (Sentry or equivalent) -- `console.error` only. In production, unexpected errors are invisible unless someone is actively tailing logs. | Security, Performance, Deployment Readiness | HIGH |
| D3 | No automated dependency-vulnerability scanning wired into any pipeline, because no pipeline exists yet (see A10). | Security, Deployment Readiness | MEDIUM |
| D4 | No graceful shutdown handling (`SIGTERM`/`SIGINT`) in `server.js` -- a rolling deploy would hard-kill in-flight requests rather than draining them. | Backend, Deployment Readiness | MEDIUM |
| D5 | No process-level `uncaughtException`/`unhandledRejection` handlers. | Backend | MEDIUM |
| D6 | Positive finding, not a gap: helmet, CORS allowlist (multi-origin), `express-mongo-sanitize`, 1MB body-size limit, bcrypt, JWT access/refresh rotation with reuse detection, and `SameSite=strict` on the refresh cookie are all **already correctly in place**. Flagged so it isn't miscounted as a gap. | Security | N/A (strength) |
| D7 | A moderate-severity transitive vulnerability (`qs`, via `body-parser`/`express`) surfaced during this session's `npm audit` -- a live demonstration that the CI audit gate (added this session) does its job over time as the advisory database updates, not just at the moment it was written. `npm audit fix` alone doesn't resolve it (the fix requires an Express major-version bump); left as a documented, non-blocking finding rather than risking a disruptive framework upgrade -- confirmed `npm audit --audit-level=high` still exits 0, so CI is unaffected. | Security | LOW |

### E. Database issues

| # | Finding | Area | Severity |
|---|---|---|---|
| E1 | `connectDB()` has no retry/backoff on initial connection failure -- if Mongo isn't reachable at boot, the process exits immediately. | Database, Deployment Readiness | MEDIUM |
| E2 | No index-usage audit has been run against real production-scale data -- 40 indexes exist and cover the obvious hot paths, but this has only been verified by code review, never by `explain()` against populated data. | Database, Performance | LOW |
| E3 | `XPTransaction` and `ContentAuditLog` are append-only, unbounded-growth collections with no archival/retention policy. Fine at current scale. | Database, Scalability | LOW |
| E4 | No database backup/restore strategy is documented or automated anywhere in this project. | Database, Deployment Readiness | HIGH |

### F. API inconsistencies

| # | Finding | Area | Severity |
|---|---|---|---|
| F1 | Child-facing list endpoints consistently use `?childId=` to enrich responses with unlock status; admin CRUD correctly omits it. Verified consistent, not a finding. | API | N/A |
| F2 | The admin dashboard's `activeUsers` field is an object (two sub-metrics) rather than a single number -- the right call given the ambiguity of "active user" for this product, but worth confirming this shape is what any future analytics/BI tool expects before it's load-bearing elsewhere. | API, Analytics | LOW |
| F3 | `getPopularContent()` pulls **every** completed `GameSession`/`RecipeProgress` document into memory to compute top-5 lists, with no limit on the initial query. Fine today; a real memory/latency concern as completion volume grows into the tens of thousands. | API, Database, Performance, Scalability | MEDIUM |
| F4 | No documented API versioning/deprecation policy beyond the existing `/api/v1/` prefix. | API | LOW |

### G. Mobile/web inconsistencies

| # | Finding | Area | Severity |
|---|---|---|---|
| G1 | Feature parity gap: web's unbuilt areas at least render a friendly placeholder route; several of Flutter's unbuilt areas have no corresponding UI route yet at all. | Web, Mobile | MEDIUM |
| G2 | Avatar cosmetics (A9) consumed by neither client -- a parity gap, not just a missing feature, since it means neither client's avatar picker matches what the backend can actually do. | Web, Mobile, Gamification | MEDIUM |
| G3 | Flutter has a documented push-notification *architecture* (even if unwired to real Firebase); the web app has no equivalent consideration at all (no service worker, no Web Push). | Web, Mobile, Notifications | MEDIUM |
| G4 | Both clients independently hardcode the same color palette rather than sharing one design-token source of truth -- will drift the first time either is updated without the other. | Web, Mobile | LOW |
| G5 | The web app has a fully separate Admin surface; Flutter has none. Very likely the correct product decision, but it hasn't been explicitly written down as a decision anywhere. | Admin Panel, Mobile | LOW |

### H. Performance issues

| # | Finding | Area | Severity |
|---|---|---|---|
| H1 | `achievementEngine.checkAndAwardAchievements()` loops over not-yet-earned published achievements with a sequential `await` per candidate (deliberate, for deterministic award ordering). Safe today at small catalog size; needs attention once the catalog grows into the hundreds. | Gamification, Performance | LOW |
| H2 | Same N+1 pattern as C3/F3, called out again under Performance since it spans both categories. | Backend, Performance | LOW-MEDIUM |
| H3 | No caching layer (Redis or equivalent) anywhere -- every request, including read-heavy catalog reads, hits MongoDB directly. Reasonable at current scale. | Backend, Scalability | LOW |
| H4 | Web app's production bundle is a single ~400KB (114KB gzipped) JS chunk -- no route-based code splitting yet. Fine at current app size; worth revisiting once Games/Recipes/Grocery/full Parent Dashboard are built. | React Web, Performance | LOW |

### I. Scalability concerns

| # | Finding | Area | Severity |
|---|---|---|---|
| I1 | In-memory rate limiter (D1) -- the most concrete near-term scalability blocker, since it's a *correctness* regression the moment the API is horizontally scaled. | Security, Scalability | **HIGH** |
| I2 | No background job/queue system (e.g. BullMQ) for anything -- email sending (once real), push fan-out, and future batch processing would all run inline or need to be built from scratch when needed. | Backend, Scalability | MEDIUM |
| I3 | Single MongoDB instance/connection string, no read-replica or sharding consideration documented -- appropriate for launch scale, called out so it's a conscious "not yet." | Database, Scalability | LOW |
| I4 | `ContentAuditLog` and `XPTransaction` are the fastest-growing collections in the system with no documented retention/archival policy -- worth a decision before either affects backup time or dashboard query latency. | Database, Scalability | LOW |

---

## Accessibility audit

- Web: `focus-visible` global ring, 44px minimum touch targets, semantic landmarks, `aria-live` regions on loading/error states, skip-to-content link -- all genuinely implemented and verified in earlier builds. **No outstanding CRITICAL/HIGH accessibility gaps found in what's built.** Gap: nothing built yet for Games/Recipes/Grocery means their accessibility can't be assessed until they exist (MEDIUM, a build task, not a defect).
- Flutter: `MaterialTapTargetSize.padded`, reduced-motion checks via `MediaQuery`, `Semantics` labels on interactive widgets in what's built -- same story, same caveat about unbuilt screens.
- Neither client has been tested with an actual screen reader (VoiceOver/TalkBack) or against WCAG contrast ratios with real rendered output (only token values were reviewed). **MEDIUM** -- recommend a real assistive-tech pass before public beta, not just code-level checks.

---

## PHASE 1 - CRITICAL BEFORE LAUNCH

1. ~~**Wire up real email delivery**~~ -- **partially addressed**: the broken links (B1/B2) are fixed and a real provider integration point is clearly isolated to one function (`sendEmail` in `email.service.js`), but actually calling a real provider (SES/Postmark/SendGrid) still requires provisioning that account and credentials -- not done this session.
2. ~~Fix the password-reset/verification email links~~ -- **DONE**.
3. **Generate the Flutter native projects** (`flutter create .`) and get the app actually building/running on iOS and Android -- A6. **Not done this session** -- no Flutter SDK available in this sandbox.
4. ~~**Build the core product loop on web**: Games, Recipes, Grocery screens~~ -- A4. **DONE** (across subsequent sessions): Flavor Hub, Games (quiz gameType only -- see the Games entry further up), Recipes (full cooking-mode flow), Grocery, and the full Parent Dashboard are all real, tested pages now. Web's A4 is closed.
5. **Build the core product loop on Flutter** (or explicitly scope launch as web-only/mobile-later) -- A5. **Not done this session.**
6. ~~Make the health check verify real DB connectivity~~ -- **DONE**.
7. ~~Move the rate limiter to a shared store~~ -- **DONE** (optional, activates via `REDIS_URL`).
8. ~~Stand up a minimal deployment pipeline~~ -- **DONE**: Dockerfile, docker-compose, and CI now exist. Docker build itself is unverified (no Docker daemon in this sandbox) -- build it once for real before trusting it in a deploy pipeline.
9. ~~Set up error tracking~~ -- **DONE** (optional, activates via `SENTRY_DSN`).
10. ~~Document and test a database backup/restore procedure~~ -- **partially done**: documented and command-verified against MongoDB's own docs, **not yet exercised against a live database** anywhere in this project.

## PHASE 2 - IMPORTANT BEFORE PUBLIC BETA

1. Build the full multi-tab Parent Dashboard on web (weekly summary, achievements, settings) and its Flutter equivalent -- A4/A5 continuation.
2. Build a real Notifications system: backend model + delivery, the `push-tokens` endpoint the mobile client already expects, and a real Firebase project wired to the existing mobile architecture -- A2, A12, B4.
3. Scope and build a COPPA-aware analytics approach -- A3.
4. Add graceful shutdown and process-level exception handlers to the API -- D4, D5.
5. Add connection retry/backoff to `connectDB()` -- ~~E1~~ **DONE**.
6. Centralize the duplicated `getOwnedChild` check into one shared helper -- ~~C1~~ **DONE**.
7. Fix the N+1 query patterns in the admin dashboard and region-assigned-content views -- ~~C3/F3/H2~~ **DONE**: both the admin dashboard's popular-content query and the region list's per-region game-count query are fixed and tested.
8. Wire avatar cosmetics into both clients' avatar pickers -- A9/G2.
9. Add dependency-vulnerability scanning to the new CI pipeline -- D3.
10. Run a real accessibility pass with assistive technology on everything built so far.
11. Add image/file upload support for admin content (cover images, icons) instead of raw text keys -- A8.

## PHASE 3 - POST-LAUNCH IMPROVEMENTS

1. Add a caching layer (Redis) for read-heavy catalog endpoints -- H3.
2. Add a background job/queue system for email, push, and batch processing -- I2.
3. Add bulk actions and the `ContentAuditLog` history viewer to the admin panel -- A7.
4. Route-based code splitting on the web app as its bundle grows -- H4.
5. Define a retention/archival policy for `XPTransaction` and `ContentAuditLog` -- E3/I4.
6. Share design tokens between web and Flutter from one source instead of two hardcoded copies -- G4.
7. Formalize the "admin is web-only" decision in documentation -- G5.
8. Revisit achievement-engine evaluation performance once the catalog grows -- H1.

## PHASE 4 - FUTURE EXPANSION

1. Read-replica/sharding strategy for MongoDB once traffic justifies it -- I3.
2. Formal API versioning/deprecation policy -- F4.
3. Index-usage audit against real production-scale data -- E2.
4. Expand analytics into a full admin BI view once the base system (A3) is live and trusted.
5. Explore internationalization/localization if the product expands beyond its current market.
