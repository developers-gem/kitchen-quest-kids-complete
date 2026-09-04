import '../../../models/user.dart';
import '../../../models/organization.dart';
import '../../../services/api_client.dart';

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});
  final String accessToken;
  final String refreshToken;
}

class RegisterResult {
  const RegisterResult({required this.user, required this.organization, required this.tokens});
  final User user;
  final Organization organization;
  final AuthTokens tokens;
}

class LoginResult {
  const LoginResult({required this.user, required this.tokens});
  final User user;
  final AuthTokens tokens;
}

class ParentalGateChallenge {
  const ParentalGateChallenge({required this.question, required this.challengeToken});
  final String question;
  final String challengeToken;
}

/// One thin module per backend resource, exactly like the web app's
/// api/auth.ts -- no validation, no business rules, just typed
/// request/response shaping. All real validation (password strength,
/// consent requirement, rate limiting) lives server-side and is
/// re-enforced there regardless of what this layer does.
class AuthRepository {
  AuthRepository(this._client);

  final ApiClient _client;

  Future<RegisterResult> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? familyName,
    String? timezone,
  }) async {
    final data = await _client.post<Map<String, dynamic>>('/auth/register', body: {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'password': password,
      if (familyName != null) 'familyName': familyName,
      'consentAcknowledged': true,
      if (timezone != null) 'timezone': timezone,
    });

    return RegisterResult(
      user: User.fromJson(data['user'] as Map<String, dynamic>),
      organization: Organization.fromJson(data['organization'] as Map<String, dynamic>),
      tokens: AuthTokens(accessToken: data['accessToken'] as String, refreshToken: data['refreshToken'] as String),
    );
  }

  Future<LoginResult> login(String email, String password) async {
    final data = await _client.post<Map<String, dynamic>>('/auth/login', body: {
      'email': email,
      'password': password,
    });

    return LoginResult(
      user: User.fromJson(data['user'] as Map<String, dynamic>),
      tokens: AuthTokens(accessToken: data['accessToken'] as String, refreshToken: data['refreshToken'] as String),
    );
  }

  Future<AuthTokens> refresh(String refreshToken) async {
    final data = await _client.post<Map<String, dynamic>>('/auth/refresh', body: {'refreshToken': refreshToken});
    return AuthTokens(accessToken: data['accessToken'] as String, refreshToken: data['refreshToken'] as String);
  }

  Future<void> logout(String? refreshToken) {
    return _client.post<dynamic>('/auth/logout', body: {'refreshToken': refreshToken});
  }

  Future<void> forgotPassword(String email) {
    return _client.post<dynamic>('/auth/forgot-password', body: {'email': email});
  }

  Future<void> resetPassword(String token, String password) {
    return _client.post<dynamic>('/auth/reset-password', body: {'token': token, 'password': password});
  }

  Future<ParentalGateChallenge> requestParentalGateChallenge() async {
    final data = await _client.post<Map<String, dynamic>>('/auth/parental-gate/challenge');
    return ParentalGateChallenge(question: data['question'] as String, challengeToken: data['challengeToken'] as String);
  }

  Future<String> verifyParentalGate(String challengeToken, int answer) async {
    final data = await _client.post<Map<String, dynamic>>('/auth/parental-gate/verify', body: {
      'challengeToken': challengeToken,
      'answer': answer,
    });
    return data['gateToken'] as String;
  }

  /// Technically GET /users/me, not an /auth/* route -- kept here rather
  /// than a separate UsersRepository because its only current caller is
  /// session bootstrapping (attempt-silent-login needs the profile right
  /// after a token refresh). A Settings feature needing account details
  /// later can call this same method rather than duplicating it.
  Future<User> getCurrentUser() async {
    final data = await _client.get<Map<String, dynamic>>('/users/me');
    return User.fromJson(data);
  }
}
