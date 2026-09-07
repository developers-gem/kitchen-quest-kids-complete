# Kitchen Quest Kids — Project Bundle

Three separate projects sharing one API contract:

```
kitchen-quest-api/       Node/Express/MongoDB backend
kitchen-quest-web/       React web app
kitchen_quest_mobile/    Flutter mobile app
```

## Before your team touches anything

**Run these two checks first — see `HOW_TO_VERIFY.md` for the exact
step-by-step commands.** Everything else in this bundle assumes they
pass — if they don't, fix that before anyone starts building on top of
this code.

1. **`cd kitchen_quest_mobile && flutter pub get && flutter test && flutter analyze`**
   This code was written and reviewed without access to a Flutter SDK in
   the environment it was built in. Every file was manually checked
   (brace balance, duplicate classes, every import resolved, every
   method signature checked against the real backend source), but that
   is not the same thing as a compiler and test runner actually
   executing it. Treat Flutter as **unverified** until this passes.

2. **A real end-to-end smoke test**: boot the actual backend against a
   real MongoDB (not the test suite's in-memory fakes), point the actual
   web app at it, and click through register → login → create a child →
   play a game → check the grocery list, by hand, in a browser. This has
   never been done — every test in this project (491 combined
   backend+web tests) runs against mocked APIs or an in-memory database
   fake. That's real coverage of the *logic*, but it is not the same as
   confirming the three pieces actually talk to each other correctly
   over real HTTP with a real database. No MongoDB instance was
   available in the environment this was built in, so this genuinely
   has never been done.

## Setup

```bash
# Backend
cd kitchen-quest-api
cp .env.example .env   # fill in real secrets -- see comments in the file
npm install
npm test                # 124/124 should pass
npm run dev             # requires a real MongoDB at MONGO_URI
npm run seed             # populates games/recipes/regions/achievements --
                          # skip this and the child-facing app will
                          # correctly show nothing at all, since a fresh
                          # database has no published content in it yet

# Web
cd kitchen-quest-web
npm install
npm test                 # 103/103 should pass
npm run dev              # proxies /api/v1 to the backend, see vite.config.ts

# Mobile
cd kitchen_quest_mobile
flutter pub get
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1   # Android emulator
```

## Where to read next

- `kitchen-quest-api/docs/PRODUCTION_READINESS_AUDIT.md` — a full audit
  across all three codebases, CRITICAL/HIGH/MEDIUM/LOW severity, with a
  phased task list (Phase 1 = before launch, Phase 2 = before public
  beta, etc.)
- `kitchen-quest-api/docs/GAP_INVESTIGATION.md` — a second, more
  targeted pass that found and fixed several real bugs after the first
  audit, including two that were genuinely serious (one broke new-user
  onboarding on web entirely; another meant certain admin-created
  content would silently never work). Read this to understand *why*
  certain things are shaped the way they are, not just *what* is there.
- Each project's own `docs/ARCHITECTURE.md` (or `README.md` for mobile)
  for module-level design decisions and what's deliberately not built
  yet versus what's an actual gap.

## The honest one-paragraph summary

The backend is the most mature and most verified part of this system —
124 real tests, exercised end-to-end against realistic fakes. The web
app is close behind — 103 tests, all 9 mini-games genuinely playable.
Both have never been run against each other for real, and Flutter has
never been run at all. Everything else — what's built, what's
deliberately deferred, and what's a real known gap — is documented in
the two audit files above rather than left for your team to rediscover.
