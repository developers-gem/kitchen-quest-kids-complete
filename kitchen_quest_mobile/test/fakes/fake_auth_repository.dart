import 'package:kitchen_quest_mobile/features/auth/data/auth_repository.dart';
import 'package:kitchen_quest_mobile/models/user.dart';

/// Configurable fake for [AuthRepository]. Each method has a matching
/// nullable callback field; a test sets only the ones it needs and
/// leaves the rest to throw "not stubbed," which surfaces a clear
/// failure if a test exercises a code path it didn't anticipate rather
/// than silently returning a default.
class FakeAuthRepository implements AuthRepository {
  Future<RegisterResult> Function({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? familyName,
    String? timezone,
  })?
  onRegister;

  Future<LoginResult> Function(String email, String password)? onLogin;
  Future<AuthTokens> Function(String refreshToken)? onRefresh;
  Future<void> Function(String? refreshToken)? onLogout;
  Future<User> Function()? onGetCurrentUser;

  @override
  Future<RegisterResult> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? familyName,
    String? timezone,
  }) {
    if (onRegister == null) throw StateError('FakeAuthRepository.register not stubbed for this test');
    return onRegister!(
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      familyName: familyName,
      timezone: timezone,
    );
  }

  @override
  Future<LoginResult> login(String email, String password) {
    if (onLogin == null) throw StateError('FakeAuthRepository.login not stubbed for this test');
    return onLogin!(email, password);
  }

  @override
  Future<AuthTokens> refresh(String refreshToken) {
    if (onRefresh == null) throw StateError('FakeAuthRepository.refresh not stubbed for this test');
    return onRefresh!(refreshToken);
  }

  @override
  Future<void> logout(String? refreshToken) {
    if (onLogout == null) return Future.value();
    return onLogout!(refreshToken);
  }

  @override
  Future<User> getCurrentUser() {
    if (onGetCurrentUser == null) throw StateError('FakeAuthRepository.getCurrentUser not stubbed for this test');
    return onGetCurrentUser!();
  }

  @override
  Future<void> forgotPassword(String email) async {}

  @override
  Future<void> resetPassword(String token, String password) async {}

  @override
  Future<ParentalGateChallenge> requestParentalGateChallenge() {
    throw UnimplementedError('Not needed by the tests using this fake yet');
  }

  @override
  Future<String> verifyParentalGate(String challengeToken, int answer) {
    throw UnimplementedError('Not needed by the tests using this fake yet');
  }
}
