import 'package:kitchen_quest_mobile/services/secure_storage_service.dart';

/// An in-memory stand-in for [SecureStorageService] used across the test
/// suite. The real implementation wraps flutter_secure_storage, which
/// talks to a platform channel (iOS Keychain / Android Keystore) that
/// doesn't exist in a plain `flutter_test` unit-test environment.
/// Implementing (not extending) the real class means the real
/// constructor -- and therefore the real platform-channel object -- is
/// never created at all, not just unused.
class FakeSecureStorageService implements SecureStorageService {
  String? _refreshToken;

  @override
  Future<void> saveRefreshToken(String token) async {
    _refreshToken = token;
  }

  @override
  Future<String?> readRefreshToken() async => _refreshToken;

  @override
  Future<void> clearRefreshToken() async {
    _refreshToken = null;
  }
}
