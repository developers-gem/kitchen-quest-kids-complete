# Kitchen Quest Kids — Flutter Mobile App

Uses the **exact same** Node.js/Express API and MongoDB database as the
React web app (`kitchen-quest-api`) -- no separate backend, no duplicated
business logic. Every rule (XP calculation, streak logic, unlock checks,
parental-gate enforcement) lives server-side; this app only renders what
the API returns and sends user actions as requests, exactly like the web
client.

## Status: Phases 1–6 complete, plus Flavor Hub and avatar cosmetics (cross-platform gap fixes); Notifications and Settings remain unbuilt

- **Phase 1** (project setup, architecture, API client, authentication,
  secure token storage): complete.
- **Phase 2** (child profile selection, home dashboard): complete.
- **Phase 3** (games): complete for the "quiz" gameType (browse, play,
  results screen). The other 8 gameTypes show an honest "not playable
  here yet" message inside the real play screen rather than a
  placeholder route -- see `docs/ARCHITECTURE.md`'s Phase 3 section.
- **Phase 4** (recipes): complete -- browse, detail, and a full
  cooking-mode flow (start/resume, step-by-step, complete, honest
  "waiting for a grown-up" state for recipes requiring parent
  verification). Deliberately reproduces a real backend edge-case fix
  found while building the web client -- see `docs/ARCHITECTURE.md`'s
  Phase 4 section.
- **Phase 5** (grocery): complete -- category-grouped items, add/toggle/
  remove, and genuinely offline-aware (the first feature to actually
  exercise `OfflineCacheService`, built back in Phase 1 and unused until
  now): toggling a checkbox while offline applies immediately and queues
  for sync; reopening the list while still offline shows the cached list
  with pending toggles overlaid; reconnecting triggers an automatic sync
  -- see `docs/ARCHITECTURE.md`'s Phase 5 section.
- **Phase 6** (parent dashboard): complete -- six tabs (Overview, This
  Week, Learning, Activity, Grocery, Settings), gated once via the
  existing parental-gate helper, against a backend contract that was
  already complete -- see `docs/ARCHITECTURE.md`'s Phase 6 section.
- **Flavor Hub** (never part of the original 6-phase plan for mobile at
  all -- a gap found during a fresh investigation pass, not a phase that
  was simply pending): region browsing and per-region game listing, now
  built to match the web client's long-complete Flavor Hub -- see
  `docs/ARCHITECTURE.md`'s Flavor Hub section.
- **Avatar cosmetics** (found missing from both clients during the same
  investigation pass): both `AvatarCatalog` and `AvatarSelector` now
  render cosmetics with locked/unlocked state -- see
  `docs/ARCHITECTURE.md`'s avatar cosmetics section.
- **Notifications and Settings** (never part of the numbered phase plan,
  but present in the requested `features/` architecture) remain empty
  aside from a README documenting the expected structure when built.

This means every phase from the original plan, plus both gaps found in
a later cross-platform investigation, now has a real screen behind it on
both web and mobile. The one remaining, consistently-documented gap: 8
of 9 game types have no interactive player yet on mobile (web has 2 of
9 -- quiz and matching).

See `docs/ARCHITECTURE.md` for the full state-management rationale,
per-requirement status table, and **an explicit, unglossed account of
what has and hasn't been verified** -- read that before treating this as
ready to build.

## Running it for real

```bash
flutter create .        # generates android/ and ios/ native project folders
                         # against this pubspec.yaml (not included here --
                         # requires the Flutter SDK, which this deliverable
                         # was built without access to)
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

`10.0.2.2` is the Android emulator's alias for the host machine's
localhost. iOS simulator can use `http://localhost:4000/api/v1` directly;
a physical device needs the host machine's real LAN IP or a deployed
staging URL.

## Structure

```
lib/
  core/         cross-cutting, framework-light utilities (failures, constants,
                app lifecycle observer)
  config/       env config, theme/design tokens (matches the web app's palette)
  services/     ApiClient + interceptors, secure storage, connectivity,
                offline cache, local + push notification services
  models/       plain Dart classes mirroring backend response shapes
  shared/
    providers/  Riverpod DI wiring for every cross-cutting service
    widgets/    reusable widgets: state placeholders, XPBar/StreakBadge,
                ChildHeader, ProgressCard/GameCard/RecipeCard,
                AvatarSelector, ParentalGateDialog, RewardAnimation
  features/
    auth/                 data/application/presentation -- complete (Phase 1)
    child_profiles/       data/application/presentation -- complete (Phase 2)
    home/                 data/presentation -- complete (Phase 2)
    games/                data/application/presentation -- complete (Phase 3): quiz gameType only, other 8 types show an honest placeholder within the real screen
    recipes/              data/application/presentation -- complete (Phase 4): full cooking-mode flow
    grocery/               data/application/presentation -- complete (Phase 5): offline-aware, exercises OfflineCacheService for the first time
    parent_dashboard/      data/application/presentation -- complete (Phase 6)
    flavor_hub/            data/application/presentation -- complete (gap-investigation fix): region browsing, previously absent from mobile entirely
    notifications/         placeholder
    settings/              placeholder
  routes/       go_router config: auth-gated redirect, deep-link route
                shapes, splash screen during session bootstrapping
  main.dart      app entry point: ProviderScope, theme, lifecycle observer
docs/
  ARCHITECTURE.md   state-management rationale + honest verification status
```

## Key design points worth knowing about

- **The access token lives only in memory** (`TokenStore`); only the
  **refresh token** is persisted, in the platform secure store
  (`flutter_secure_storage`) -- never SharedPreferences. This mirrors the
  web app's identical split and the backend's stated auth threat model.
- **The parental gate wraps every sensitive action** (`ensureParentalGate`
  helper), not just the parent dashboard -- creating, editing, or
  deleting a child profile all require it, matching the backend's actual
  enforcement.
- **The retry strategy only ever retries GET requests** on transient
  network failures -- mutating calls are never auto-retried, since that
  could manufacture a duplicate action.
- **The splash screen exists specifically to prevent a one-frame flash**
  of a protected route before the silent-login check resolves -- the
  router's `redirect` logic forces every route through `/splash` while
  `AuthController`'s state is loading.
- **Push notifications are architecture only**, explicitly not wired to
  a real Firebase project -- see `push_notification_service.dart`'s doc
  comment for why faking that would be worse than being upfront about it.
