# How to run the two pre-handoff checks

Both of these need things that don't exist in the environment this
project was built in (a Flutter SDK, a real MongoDB) — so they need to
be run on your own machine or CI, by your team. This doc is the exact
steps.

---

## 1. Flutter: `flutter test` and `flutter analyze`

### Install the SDK (skip if already installed)
- **macOS**: `brew install --cask flutter`, or download from
  https://docs.flutter.dev/get-started/install/macos
- **Windows/Linux**: download from
  https://docs.flutter.dev/get-started/install
- Confirm it's installed correctly: `flutter doctor` — fix anything it
  flags as missing (Xcode/Android Studio components, etc.) before
  continuing. You don't need a physical device or emulator for the
  commands below — `flutter test`/`flutter analyze` run without one.

### Run the checks
```bash
cd kitchen_quest_mobile
flutter pub get
flutter analyze
flutter test
```

**What "done" looks like**: `flutter analyze` reports "No issues found!"
and `flutter test` reports all tests passing (there are 18 test files
covering models and controllers).

**If something fails**: that's the point of running this — it means
something in the Dart code has a real error the manual review here
couldn't catch (a type mismatch, a null-safety issue, etc.). Fix the
specific reported error and re-run. Given how carefully this was
reviewed by hand, I'd expect at most small, mechanical fixes — but I
can't promise that without having run it myself.

### Once that passes, optionally also try it on a real device/emulator
```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1   # Android emulator
# or
flutter run --dart-define=API_BASE_URL=http://localhost:4000/api/v1  # iOS simulator
```
This needs the backend running too — see step 2 below for that.

---

## 2. A real end-to-end smoke test (backend + web, real MongoDB)

### Easiest path: Docker Compose (recommended)
The backend already has a `docker-compose.yml` that stands up the API,
MongoDB, and Redis together. **This itself has never been built or run**
— running it for the first time is part of what you're verifying.

```bash
cd kitchen-quest-api
docker compose up --build
```

Wait for it to report the API listening (should be quick — Mongo/Redis
have healthchecks the API waits on). Then in a second terminal:

```bash
curl http://localhost:4000/health
# Expect: {"success":true,"data":{"status":"ok","database":"connected"}}
```

If that responds correctly, the backend is genuinely up against a real
database for the first time.

### If Docker isn't available: manual setup
```bash
# Install MongoDB Community Edition:
# https://www.mongodb.com/docs/manual/administration/install-community/
# Then start it (varies by OS, e.g. on macOS with Homebrew):
brew services start mongodb-community

cd kitchen-quest-api
cp .env.example .env
# Edit .env: fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# PARENTAL_GATE_SECRET with any long random strings for local testing.
npm install
npm run dev
```

Confirm the same way: `curl http://localhost:4000/health` should show
`"database":"connected"`.

### Seed the database -- do this next, regardless of which path above you used
**This step was missing from the original version of this doc, and is
almost certainly why a first run shows no games/recipes/regions
anywhere.** The child-facing app only ever shows *published* content
(correctly -- draft content shouldn't be visible to children), and a
brand-new database has no content in it at all until something creates
some. Real seed data already exists covering all 9 gameTypes, 5 recipes,
10 regions, and a handful of achievements -- it just needs to actually
be run once.

**If you used Docker Compose above**, run the seed script *inside* the
running API container, so it automatically picks up the same
`MONGO_URI` the container is already using (pointing at the `mongo`
service by its container hostname, not `localhost`):
```bash
docker compose exec api npm run seed
```

**If you used the manual setup above**, run it directly on your host
(it'll use the same `.env` your `npm run dev` is already using):
```bash
cd kitchen-quest-api
npm run seed
```

Either way this is idempotent (safe to re-run) and upserts by
slug/title, so running it again later won't create duplicates.

### Now point the real web app at it
```bash
cd kitchen-quest-web
npm install
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`). The dev
server's proxy (see `vite.config.ts`) forwards `/api/v1/*` to
`http://localhost:4000` automatically — no `.env` needed for this to
work locally.

### The actual smoke test — click through by hand
1. Register a new parent account.
2. Check your terminal running the backend — the "verification email"
   currently only logs to the console (this is a known, documented gap,
   not something broken in this test). Copy the token from that log line
   and visit `http://localhost:5173/verify-email?token=<token>` manually.
3. Add a child profile (you'll need to pass the parental-gate arithmetic
   challenge).
4. Go to Games, play a quiz game start to finish, confirm XP/stars show
   up on the results screen. Then try one or two of the other 8 types
   (matching, sorting, sequence, memory, dragAndDrop, ingredientBuilder,
   timedChallenge, maze) too -- quiz was the first one built and is the
   most battle-tested; the other 8 were built later in the same session
   and are exactly where a real bug is more likely to be hiding.
5. Go to Flavor Hub, open a region, confirm the games listed there link
   to real gameplay.
6. Go to Recipes, open one, tap "Add ingredients to grocery list."
7. Go to Grocery, confirm the ingredients from step 6 actually appear.
8. Go to Parent Dashboard, confirm the just-completed game shows up in
   the activity feed.

**If all 8 steps work**: the three pieces (web, API, MongoDB) are
confirmed talking to each other correctly for the first time. That's
the real milestone here — everything before this point was tested in
isolation against mocks and fakes, which is real coverage but not proof
the seams between the pieces are correct.

**If something breaks partway through**: note exactly which step and
what the error was (browser console + backend terminal output are both
useful) — that's a real integration bug the mocked tests couldn't have
caught, and worth fixing before broader team use.
