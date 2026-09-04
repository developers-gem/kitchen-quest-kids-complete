import 'package:connectivity_plus/connectivity_plus.dart';

/// Wraps connectivity_plus behind a simple bool stream. Used by:
///  - the grocery feature, to decide whether to hit the API or serve the
///    cached list (see offline_cache_service.dart)
///  - a small "You're offline" banner mounted near the app root, so any
///    screen can be network-aware without each one subscribing directly
///    to connectivity_plus.
///
/// Deliberately reports "has *a* connection" (wifi/cellular/ethernet
/// present), not "can definitely reach our API" -- a true reachability
/// check would mean pinging the backend on every connectivity blip, which
/// is unnecessary; API calls that fail despite a reported connection
/// still surface as NetworkUnavailableFailure/ApiFailure normally.
class ConnectivityService {
  ConnectivityService({Connectivity? connectivity}) : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  Stream<bool> get onStatusChange {
    return _connectivity.onConnectivityChanged.map(_hasConnection);
  }

  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return _hasConnection(result);
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}
