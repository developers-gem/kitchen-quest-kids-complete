import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/user.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

/// Session state as `AsyncValue<User?>`:
///  - loading  -> checking for a valid session (splash/boot state)
///  - data(null) -> logged out
///  - data(user) -> logged in
///  - error    -> treated the same as logged out by the router redirect;
///                the error itself is only useful for debugging, since a
///                failed silent-login isn't a user-facing failure (it's
///                just "no valid session," which is the normal case for
///                someone who never logged in on this device).
///
/// Mirrors the web app's AuthContext one-for-one: same three actions
/// (login/register/logout), same "attempt silent refresh on launch"
/// bootstrapping, same non-persistence of the access token itself.
class AuthController extends AsyncNotifier<User?> {
  late AuthRepository _repo;

  @override
  FutureOr<User?> build() async {
    _repo = ref.watch(authRepositoryProvider);
    return _attemptSilentLogin();
  }

  Future<User?> _attemptSilentLogin() async {
    final secureStorage = ref.read(secureStorageServiceProvider);
    final tokenStore = ref.read(tokenStoreProvider);

    final refreshToken = await secureStorage.readRefreshToken();
    if (refreshToken == null) return null;

    try {
      final tokens = await _repo.refresh(refreshToken);
      tokenStore.setAccessToken(tokens.accessToken);
      await secureStorage.saveRefreshToken(tokens.refreshToken);
      return await _repo.getCurrentUser();
    } catch (_) {
      tokenStore.clear();
      await secureStorage.clearRefreshToken();
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final result = await _repo.login(email, password);
      ref.read(tokenStoreProvider).setAccessToken(result.tokens.accessToken);
      await ref.read(secureStorageServiceProvider).saveRefreshToken(result.tokens.refreshToken);
      return result.user;
    });
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? timezone,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final result = await _repo.register(
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        timezone: timezone,
      );
      ref.read(tokenStoreProvider).setAccessToken(result.tokens.accessToken);
      await ref.read(secureStorageServiceProvider).saveRefreshToken(result.tokens.refreshToken);
      return result.user;
    });
  }

  Future<void> logout() async {
    final secureStorage = ref.read(secureStorageServiceProvider);
    final tokenStore = ref.read(tokenStoreProvider);
    final refreshToken = await secureStorage.readRefreshToken();

    try {
      await _repo.logout(refreshToken);
    } catch (_) {
      // Best-effort -- proceed with local logout regardless of whether the
      // server call succeeded, so a network blip never traps a user in a
      // logged-in-looking-but-broken state.
    }

    tokenStore.clear();
    await secureStorage.clearRefreshToken();
    state = const AsyncData(null);
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(AuthController.new);

/// Convenience derived provider for widgets that only care about the
/// yes/no question, not the loading/error nuance -- e.g. the router guard.
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authControllerProvider).valueOrNull != null;
});
