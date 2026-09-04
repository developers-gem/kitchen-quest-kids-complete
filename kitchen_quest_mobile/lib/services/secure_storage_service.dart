import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Mirrors the web app's split exactly (tokenStore.ts): the **refresh
/// token** is the only thing persisted, and it lives in the platform
/// secure store (iOS Keychain / Android Keystore via
/// flutter_secure_storage) rather than SharedPreferences, which is
/// unencrypted plain-text storage and not appropriate for a credential.
///
/// The **access token** is deliberately NOT persisted anywhere -- it's
/// held only in memory (see api_client.dart's AuthTokenNotifier) for the
/// life of the app process, exactly matching the backend auth
/// architecture's threat model: a short-lived access token minimizes the
/// blast radius if something did manage to read process memory, while
/// the long-lived refresh token gets the platform's strongest available
/// protection.
class SecureStorageService {
  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _refreshTokenKey = 'kqk.refreshToken';

  Future<void> saveRefreshToken(String token) => _storage.write(key: _refreshTokenKey, value: token);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clearRefreshToken() => _storage.delete(key: _refreshTokenKey);
}
