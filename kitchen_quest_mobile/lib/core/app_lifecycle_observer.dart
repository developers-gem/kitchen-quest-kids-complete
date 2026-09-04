import 'package:flutter/widgets.dart';

/// Centralizes app-lifecycle-driven behavior instead of scattering
/// `WidgetsBindingObserver` overrides across screens. Current
/// responsibilities:
///  - on `resumed`: re-check connectivity and trigger a grocery-list sync
///    if there are pending offline toggles queued (see
///    OfflineCacheService) -- covers "left the app offline, came back
///    online" without requiring the user to pull-to-refresh.
///  - on `paused`/`detached`: nothing destructive -- the access token
///    lives in memory only, so backgrounding the app does NOT clear it;
///    only an explicit logout or a failed silent-refresh does. This
///    matches typical mobile UX (users expect to stay logged in after
///    switching apps) while still never persisting the access token
///    itself to disk.
///
/// Callbacks are injected rather than hardcoded so this class has no
/// direct dependency on any specific repository/provider -- main.dart
/// wires the real callbacks via Riverpod once providers exist.
class AppLifecycleObserver extends WidgetsBindingObserver {
  AppLifecycleObserver({required this.onResumed, required this.onPaused});

  final Future<void> Function() onResumed;
  final Future<void> Function() onPaused;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        onResumed();
        break;
      case AppLifecycleState.paused:
        onPaused();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        break;
    }
  }
}
