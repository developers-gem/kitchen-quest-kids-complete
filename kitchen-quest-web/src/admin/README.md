# Kitchen Quest Kids — Admin & Content Management (React)

Lives entirely under `src/admin/`, deliberately separated from the
child/parent-facing app (`src/pages`, `src/components`, `src/context`) at
the codebase level, not just the route level.

## Verified

```bash
npx tsc -b --noEmit   # 0 errors
npx oxlint src         # 0 errors, 10 warnings (see below -- not bugs)
npm run build          # 0 errors, real Vite production bundle
```

Also served the production build with `vite preview` and confirmed `200`.

The 10 lint warnings are all `react(set-state-in-effect)`, one per editor
page: each editor fetches an existing item (`useQuery`) and syncs it into
local editable form state via `useEffect(() => { if (existing)
setForm(existing) }, [existing])`. This is a standard "load a resource,
then let the user edit a local copy of it" pattern -- the lint rule's
generic guidance (derive state during render instead) doesn't cleanly
apply when the source of truth is an asynchronously-fetched resource
whose id can change (navigating from editing one game to another). Not
fixed by removing the pattern; flagged here as an intentional choice
consistent with how the rest of this codebase already documents such
trade-offs, rather than silently accepting a warning that looked wrong.

## Two-layer separation from the child-facing experience

1. **`AdminGuard`** (route-level): a parent account without the
   `platform_admin` role is redirected to `/dashboard` before any admin
   route renders, never transiently shown admin UI.
2. **`AdminLayout`** (visual): a dark-sidebar, information-dense shell,
   structurally distinct from `AppLayout`'s warm rounded-card family
   aesthetic -- an admin editing content is doing different work than a
   family using the app, and the UI says so at a glance.

Both are frontend conveniences. The actual security boundary is
server-side (`authorize(platform_admin)` on every `/api/v1/admin/*`
route) -- this frontend guard exists so a non-admin never even sees the
option, not because the frontend can be trusted to enforce access control.

## Architecture: symmetric with the backend

The backend's `createAdminContentService` factory (list/get/create/
update/transitionStatus/remove, generated per content type) has a direct
frontend counterpart: `createAdminApi<T>(basePath)`. Adding a 7th
admin-managed content type is a few lines against this factory on both
sides, not a new module's worth of boilerplate on either.

```
admin/
  types/
    adminContent.ts    ContentStatus, ALLOWED_TRANSITIONS (mirrors the
                        backend's contentWorkflow.js exactly), AuditFields
    contentTypes.ts     per-content-type interfaces (Game, Recipe, Region,
                        NutritionLesson, FoodFact, Achievement, Dashboard)
  api/
    adminApiClient.ts   the generic createAdminApi<T> factory
    adminGames.ts, adminRecipes.ts, adminRegions.ts, adminNutrition.ts,
    adminAchievements.ts, adminDashboard.ts
                        thin per-type wrappers around the factory
  components/
    AdminGuard.tsx, AdminLayout.tsx
    ContentStatusBadge.tsx    draft/review/published/archived pill
    WorkflowActions.tsx       only renders transitions the backend's
                              state machine would actually accept
    AdminContentListPage.tsx generic paginated/searchable/filterable list,
                              reused by every content type
    JsonField.tsx             raw-JSON editor for genuinely polymorphic
                              fields (see below)
    TagListInput.tsx          add/remove chip editor for string[] fields
  pages/
    AdminDashboardPage.tsx
    games/, recipes/, regions/, nutrition/, achievements/
                        one ListPage + one EditorPage per content type
```

## The JSON-editor decision (read before extending this)

Four fields across this system are genuinely polymorphic: a game's
`configuration` (9 different shapes depending on `gameType`), a game's or
region's `unlockRequirements`, an achievement's `unlockCriteria`, and a
nutrition lesson's optional `quiz` (which deliberately reuses the same
shape as a game's `quiz` type, per the backend's design). `JsonField` is a
plain textarea with live parse-error feedback for all four, rather than a
bespoke visual builder per shape.

This is a genuine scope decision, not a shortcut taken silently: building
9 different visual config builders (one per game type) plus a visual rule
builder for the unlock-rule vocabulary (`always`, `levelAtLeast`,
`gameCompleted`, `gameStarsAtLeast`, `allOf`, `anyOf`, nestable) is real,
substantial follow-up work -- reasonable to defer until it's clear which
shapes admins actually author most often in practice, rather than
building nine bespoke editors speculatively. `JsonField`'s hint text on
the Games editor spells out each `gameType`'s expected shape so this
isn't a bare textarea with no guidance.

## What's NOT built

- Runtime achievement-awarding logic (the `unlockCriteria` an admin
  authors here isn't evaluated against any child's progress yet -- that
  requires wiring into the games/recipes completion flows, flagged as a
  later phase on the backend's `Achievement` model itself).
- Bulk actions (bulk-publish, bulk-archive), content preview-as-a-child
  view, and the `ContentAuditLog` history viewer (the backend records
  full history; there's no admin UI screen to browse it yet).
- Image upload for `coverImage`/`icon`/`media` fields -- these are
  currently plain text inputs for a storage key/URL, matching the
  backend's storage-abstraction design (no upload flow wired yet).
