import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitchen_quest_mobile/features/auth/application/auth_controller.dart';
import 'package:kitchen_quest_mobile/features/auth/data/auth_repository.dart';
import 'package:kitchen_quest_mobile/models/user.dart';
import 'package:kitchen_quest_mobile/shared/providers/core_providers.dart';
import '../../fakes/fake_auth_repository.dart';
import '../../fakes/fake_secure_storage_service.dart';

User _fakeUser({String id = 'user-1'}) => User(
  id: id,
  roles: const ['parent'],
  firstName: 'Jamie',
  lastName: 'Rivera',
  email: 'jamie@example.com',
  emailVerified: true,
  status: 'active',
  organizationId: 'org-1',
  notificationPreferences: const [],
);

ProviderContainer _buildContainer(FakeAuthRepository fakeRepo, FakeSecureStorageService fakeStorage) {
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(fakeRepo),
      secureStorageServiceProvider.overrideWithValue(fakeStorage),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('AuthController: session bootstrap (silent login)', () {
    test('resolves to logged-out (null) when there is no stored refresh token', () async {
      final fakeRepo = FakeAuthRepository();
      final fakeStorage = FakeSecureStorageService(); // no refresh token saved
      final container = _buildContainer(fakeRepo, fakeStorage);

      final user = await container.read(authControllerProvider.future);

      expect(user, isNull);
      expect(container.read(isAuthenticatedProvider), isFalse);
    });

    test('restores the session when a valid refresh token exists on disk', () async {
      final fakeRepo = FakeAuthRepository()
        ..onRefresh = (token) async {
          expect(token, 'stored-refresh-token');
          return const AuthTokens(accessToken: 'new-access-token', refreshToken: 'rotated-refresh-token');
        }
        ..onGetCurrentUser = () async => _fakeUser();

      final fakeStorage = FakeSecureStorageService();
      await fakeStorage.saveRefreshToken('stored-refresh-token');
      final container = _buildContainer(fakeRepo, fakeStorage);

      final user = await container.read(authControllerProvider.future);

      expect(user, isNotNull);
      expect(user!.email, 'jamie@example.com');
      expect(container.read(isAuthenticatedProvider), isTrue);
      // The rotated refresh token must have been persisted, not just the
      // access token held in memory.
      expect(await fakeStorage.readRefreshToken(), 'rotated-refresh-token');
    });

    test('treats an expired/revoked refresh token as logged-out, not an error state', () async {
      final fakeRepo = FakeAuthRepository()..onRefresh = (token) async => throw Exception('refresh token expired');
      final fakeStorage = FakeSecureStorageService();
      await fakeStorage.saveRefreshToken('stale-token');
      final container = _buildContainer(fakeRepo, fakeStorage);

      final user = await container.read(authControllerProvider.future);

      expect(user, isNull);
      // The stale token must be cleared so future launches don't keep
      // retrying a refresh that will never succeed.
      expect(await fakeStorage.readRefreshToken(), isNull);
    });
  });

  group('AuthController: login', () {
    test('a successful login updates state to the logged-in user and persists the refresh token', () async {
      final fakeRepo = FakeAuthRepository();
      final fakeStorage = FakeSecureStorageService();
      final container = _buildContainer(fakeRepo, fakeStorage);
      await container.read(authControllerProvider.future); // resolve initial bootstrap (logged out)

      fakeRepo.onLogin = (email, password) async {
        expect(email, 'jamie@example.com');
        expect(password, 'StrongPass123');
        return LoginResult(
          user: _fakeUser(),
          tokens: const AuthTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );
      };

      await container.read(authControllerProvider.notifier).login('jamie@example.com', 'StrongPass123');

      final state = container.read(authControllerProvider);
      expect(state.value, isNotNull);
      expect(state.hasError, isFalse);
      expect(await fakeStorage.readRefreshToken(), 'refresh-1');
    });

    test('a rejected login surfaces as an error state, not a silently-logged-out state', () async {
      final fakeRepo = FakeAuthRepository();
      final fakeStorage = FakeSecureStorageService();
      final container = _buildContainer(fakeRepo, fakeStorage);
      await container.read(authControllerProvider.future);

      fakeRepo.onLogin = (email, password) async => throw Exception('Invalid email or password');

      await container.read(authControllerProvider.notifier).login('jamie@example.com', 'WrongPassword');

      final state = container.read(authControllerProvider);
      expect(state.hasError, isTrue);
      expect(container.read(isAuthenticatedProvider), isFalse);
    });
  });

  group('AuthController: logout', () {
    test('clears session state and the stored refresh token even if the server call fails', () async {
      final fakeRepo = FakeAuthRepository()
        ..onLogin = (email, password) async => LoginResult(
          user: _fakeUser(),
          tokens: const AuthTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        )
        ..onLogout = (refreshToken) async => throw Exception('network blip');

      final fakeStorage = FakeSecureStorageService();
      final container = _buildContainer(fakeRepo, fakeStorage);
      await container.read(authControllerProvider.future);
      await container.read(authControllerProvider.notifier).login('jamie@example.com', 'StrongPass123');
      expect(container.read(isAuthenticatedProvider), isTrue);

      await container.read(authControllerProvider.notifier).logout();

      expect(container.read(authControllerProvider).value, isNull);
      expect(container.read(isAuthenticatedProvider), isFalse);
      expect(await fakeStorage.readRefreshToken(), isNull);
    });
  });
}
