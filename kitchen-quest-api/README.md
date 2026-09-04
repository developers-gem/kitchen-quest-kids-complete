# Kitchen Quest Kids — API (Phase 1)

Phase 1 of the backend: **Authentication, Users, Families, Child Profiles.**
Node.js + Express + MongoDB/Mongoose, per the architecture and database
design docs produced earlier in this project.

## Running it for real

```bash
cp .env .env      # fill in real secrets + a real MONGO_URI
npm install
npm run dev                # starts on PORT (default 4000)
```

Requires a real MongoDB instance (local `mongod`, Docker, or Atlas) reachable
at `MONGO_URI`. This is *not* wired up in this sandbox — see "About the test
suite" below.

## About the test suite

`npm test` runs 23 tests (Jest + Supertest) covering the full request path —
routes → middleware → controllers → services — for every Phase 1 endpoint,
including:

- registration (consent required, duplicate email rejected, weak passwords rejected)
- login (generic error message on both bad email and bad password, no user enumeration)
- refresh-token **rotation and reuse/theft detection** (replaying an already-rotated
  token revokes every session for that user)
- logout, forgot/reset password
- the parental-gate challenge/verify flow
- child profile CRUD, the parental-gate requirement on create/update/delete,
  cross-family isolation (404, not data leakage, when reaching for another
  family's child), the max-children guardrail, profile "activation" (switching),
  the progress-summary endpoint, and confirming `allergies` never appears in a
  default read (`select: false` working as intended)

**Why the models are mocked in this environment:** this sandbox's network
policy blocks `fastdl.mongodb.org`, which is where `mongodb-memory-server`
downloads its embedded MongoDB binary from — confirmed with a direct request,
which returns a fast 403 rather than hanging. Since a real embedded MongoDB
isn't reachable here, `jest.config.js` remaps the five model files to small
in-memory fakes (`tests/mocks/`) that implement the subset of the Mongoose
query API this codebase actually calls (`find`, `findOne`, `findById`,
`create`, `findOneAndUpdate`, `updateOne`, `updateMany`, `countDocuments`,
plus `doc.save()`), including field-level `select: false` hiding and schema
defaults. This still exercises every real line of route/middleware/
controller/service code end-to-end via `supertest` — only the storage layer
underneath is swapped out.

I also independently verified the **real** Mongoose schemas load and
register cleanly with zero errors:

```bash
NODE_ENV=development node -e "
  const createApp = require('./src/app');
  createApp();
  console.log(require('mongoose').modelNames());
"
# -> [ 'User', 'RefreshToken', 'ConsentRecord', 'Organization', 'ChildProfile' ]
```

**Before this ships anywhere real:** delete `moduleNameMapper` from
`jest.config.js` (or run in an environment with normal network access) and
re-run this exact same test suite against either a real `mongodb-memory-server`
or a real MongoDB/Atlas instance. That gets you the same behavioral coverage
*plus* real Mongoose-level schema validation, unique-index enforcement, and
TTL-index behavior (e.g. `RefreshToken.expiresAt`) that the in-memory fakes
don't replicate. I'd flag this as the one open item before Phase 1 is
considered fully verified — the code is production-shaped, but hasn't been
proven against a real database in this session.

## What's implemented

See `AGENTS.md`-style module layout below. Every module follows:
`*.model.js` → `*.validation.js` (zod) → `*.service.js` (business logic) →
`*.controller.js` (thin) → `*.routes.js` (wiring + middleware).

```
src/
  config/        env validation (fail-fast outside dev), db connection, shared enums
  middleware/    authenticate, authorize, validateRequest, parentalGate,
                 rateLimiter, errorHandler, requestLogger
  modules/
    auth/        register, login, refresh (rotation+reuse detection), logout,
                 forgot/reset password, verify-email, parental gate
    users/       get/update/soft-delete own profile
    families/    Organization (family/school-generalized) settings
    children/    child profile CRUD, activate (switch), progress summary
  routes/v1/     mounts all module routers under /api/v1
  services/      email.service.js (stubbed provider, logs in dev/test)
  utils/         ApiError, ApiResponse envelope, asyncHandler, pagination, tokenUtils
  validators/    shared zod primitives (objectId, pagination)
  app.js         middleware pipeline assembly
  server.js      process entry point
tests/
  auth.test.js, children.test.js
  mocks/         test-only in-memory model fakes (see above)
```

## Security features implemented in Phase 1

- Passwords hashed with bcrypt (12 rounds), never returned in any response (`select: false` + custom `toJSON`)
- JWT access tokens (short-lived) + opaque, hashed refresh tokens with **rotation and reuse detection**
- Parental gate (arithmetic challenge → short-lived gate token) protecting child-creation/edit/delete and account deletion
- No child profile ever has an email/password field — structurally impossible to log in as a child
- Generic auth error messages (no user enumeration on login or forgot-password)
- `express-mongo-sanitize` strips `$`/`.` keys from input (NoSQL injection guard)
- `helmet` secure headers, CORS restricted to configured origin(s) with credentials
- Rate limiting (tighter on `/auth/*`)
- Central error handler normalizing Mongoose/JWT/unexpected errors into one response shape
- `ConsentRecord` written at registration as a COPPA-style evidence trail
