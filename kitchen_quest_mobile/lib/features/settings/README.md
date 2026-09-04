# settings feature — not yet built

Reserved per the requested `features/` architecture. See
`docs/ARCHITECTURE.md` for phase status and `routes/app_router.dart`
for the placeholder route currently serving this feature's nav destination.

Expected structure when built (matching every other feature module):
```
settings/
  data/           repository classes over ApiClient
  application/    Riverpod controllers
  presentation/   screens/widgets
```
