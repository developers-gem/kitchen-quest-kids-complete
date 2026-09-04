# Kitchen Quest Kids — Web App

React + Vite + TypeScript + React Router, consuming `kitchen-quest-api`.
Builds through **step 5 of the requested build order plus the Home
Dashboard**: project structure, API client, authentication, global layout,
active child context, dashboard. Flavor Hub / Games / Recipes / Grocery /
full Parent Dashboard are wired as placeholder routes (clearly marked,
never faked as finished) ready for the next build phase.

## Verified, not just written

```bash
npm install
npx tsc -b --noEmit   # 0 errors
npm run build         # 0 errors -- vite build succeeds
npx oxlint src        # 0 errors, 4 stylistic warnings (see below)
npm run dev           # local dev server, proxies /api/v1 to VITE_API_PROXY_TARGET
```

The production build was also served with `vite preview` and confirmed to
return `200` with the correct script/stylesheet references -- this is a
real, working build artifact, not just type-checked source.

The 4 lint warnings are `react-refresh/only-export-components` on the four
context files (each exports both a Provider component and its `useX()`
hook) -- an extremely standard pattern, flagged only because it slightly
slows hot-reload in dev, not a correctness issue. Not "fixed" by splitting
into extra files, since that would add indirection to avoid a dev-only
nitpick.

## Structure

```
src/
  types/api.ts          full TypeScript types mirroring every backend response shape
  api/
    client.ts            low-level typed fetch wrapper: auto-refresh-on-401,
                          ApiError with a stable .code for branching
    tokenStore.ts         in-memory access-token store (never localStorage --
                          matches the backend auth architecture's XSS mitigation)
    gateTokenStore.ts     in-memory parental-gate token store
    auth.ts, users.ts, children.ts, avatars.ts, games.ts, recipes.ts,
    grocery.ts, parentDashboard.ts, regions.ts
                          one thin module per backend resource -- no business
                          logic, just typed request/response shaping
  context/
    AuthContext.tsx        user + auth actions (login/register/logout/refresh)
    ActiveChildContext.tsx which child is being viewed, persisted per-user
    NotificationContext.tsx ephemeral toast queue
    ParentalGateContext.tsx imperative ensureGate() + the gate modal itself
  components/            AppLayout, ChildHeader, XPBar, StreakBadge, GameCard,
                          RecipeCard, RegionCard, ProgressCard, AvatarSelector,
                          GroceryItem, EmptyState, LoadingState, ErrorState,
                          ToastViewport
  pages/
    auth/                Login, Register, ForgotPassword, ResetPassword
    dashboard/           HomeDashboardPage
    ComingSoonPage.tsx   placeholder for not-yet-built sections
  routes/
    router.tsx           full route tree, including placeholder routes
    RequireAuth.tsx       auth guard with redirect-back-after-login
  lib/
    queryClient.ts        React Query defaults
    errors.ts             ApiError -> user-facing message helper
```

## State management strategy (why each piece lives where it does)

| State | Where | Why |
|---|---|---|
| Access token | `tokenStore.ts` (plain module, not React) | The non-React API client must read it synchronously on every request and refresh it on 401 -- a React context can't be read outside a component |
| Parental gate token | `gateTokenStore.ts` (plain module) | Same reasoning, different lifecycle (short-lived, cleared proactively) |
| Logged-in user | `AuthContext` (React state) | Only components read it; fine as ordinary state |
| Which child is active | `ActiveChildContext` (React state, localStorage-persisted per user) | Needed by nearly every screen, doesn't belong to any one page, but isn't "server data" itself |
| List of children, games, recipes, grocery list, dashboard sections | React Query (`useQuery` in each page/hook) | This is **server state** -- caching, refetch-on-invalidate, and loading/error handling are what React Query is for; duplicating it into a global store would just be a second, harder-to-keep-consistent copy |
| In-flight game session state (current question, selections) | Local component state inside the game-play view | Ephemeral, single-screen, never needed elsewhere -- no reason to lift it |
| Recipe cooking progress | Server-authoritative (`RecipeProgress.currentStepIndex` on the backend) + React Query for the current-step fetch | The backend already tracks step position for pause/resume-across-devices; the client holds only the query result, not a shadow copy of progress |
| Toast notifications | `NotificationContext` | Ephemeral UI state, deliberately kept separate from the backend's future (unbuilt) persisted Notification model |

**No Redux, no Zustand, no other global store.** The instruction to "avoid
unnecessary global state" is satisfied by recognizing that most of what
this app needs is server state (React Query's job) or single-screen state
(local `useState`) -- only four things are genuinely cross-cutting enough
to need a context, and each of those four is listed above with a concrete
reason.

## Accessibility notes

- Skip-to-content link, `aria-live` regions for loading/toast/error states
- Every interactive element has a `min-h-11` (44px) touch target
- Focus rings are a global 3px outline (`:focus-visible` in `index.css`),
  never removed without replacement
- `prefers-reduced-motion: reduce` collapses all animation/transition
  durations globally, not per-component
- Locked content (games/recipes/regions) uses `aria-disabled` and is never
  a focusable dead link
- Forms use associated `<label>`s, `aria-describedby` for hints, and
  `role="alert"` for errors

## Responsive design

Tailwind's default breakpoints (`sm:`, `lg:`) are used throughout --
2-column stat grids on mobile expand to 4 on tablet/desktop, nav wraps
rather than overflowing, and the child switcher scrolls horizontally on
narrow screens rather than wrapping awkwardly.
