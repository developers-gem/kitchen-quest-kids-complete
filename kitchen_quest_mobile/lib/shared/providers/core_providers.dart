import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/token_store.dart';
import '../../services/secure_storage_service.dart';
import '../../services/api_client.dart';
import '../../services/connectivity_service.dart';
import '../../services/offline_cache_service.dart';
import '../../services/local_notification_service.dart';
import '../../services/push_notification_service.dart';

/// One `Provider` per cross-cutting service, composed here so every
/// feature repository depends on `apiClientProvider` (etc.) rather than
/// constructing its own Dio/storage instances -- a single source of
/// truth for how the app talks to the backend, matching the "API service
/// architecture" requirement.

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final secureStorageServiceProvider = Provider<SecureStorageService>((ref) => SecureStorageService());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    tokenStore: ref.watch(tokenStoreProvider),
    secureStorage: ref.watch(secureStorageServiceProvider),
  );
});

final connectivityServiceProvider = Provider<ConnectivityService>((ref) => ConnectivityService());

/// Exposes live online/offline status as a Riverpod stream, so any widget
/// can do `ref.watch(isOnlineProvider)` instead of subscribing to
/// connectivity_plus directly.
final isOnlineProvider = StreamProvider<bool>((ref) {
  return ref.watch(connectivityServiceProvider).onStatusChange;
});

final offlineCacheServiceProvider = Provider<OfflineCacheService>((ref) => OfflineCacheService());

final localNotificationServiceProvider = Provider<LocalNotificationService>((ref) {
  return LocalNotificationService();
});

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  final service = PushNotificationService(ref.watch(apiClientProvider));
  ref.onDispose(service.dispose);
  return service;
});
