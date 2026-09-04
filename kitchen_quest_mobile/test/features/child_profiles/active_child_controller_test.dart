import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kitchen_quest_mobile/features/auth/application/auth_controller.dart';
import 'package:kitchen_quest_mobile/features/child_profiles/application/active_child_controller.dart';
import 'package:kitchen_quest_mobile/models/child_profile.dart';
import 'package:kitchen_quest_mobile/models/user.dart';
import '../../fakes/fake_auth_repository.dart';
import '../../fakes/fake_child_repository.dart';
import '../../fakes/fake_secure_storage_service.dart';

ChildProfile _child(String id, String name) => ChildProfile(
  id: id,
  familyId: 'org-1',
  displayName: name,
  ageRange: '7-9',
  avatarColor: 'primary',
  currentLevel: 1,
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  progressStats: ProgressStats.empty,
);

User _fakeUser() => const User(
  id: 'user-1',
  roles: ['parent'],
  email: 'jamie@example.com',
  emailVerified: true,
  status: 'active',
  organizationId: 'org-1',
  notificationPreferences: [],
);

Future<ProviderContainer> _buildLoggedInContainer(FakeChildRepository fakeChildren) async {
  SharedPreferences.setMockInitialValues({});

  final fakeAuthRepo = FakeAuthRepository()
    ..onLogin = (email, password) async => LoginResult(
      user: _fakeUser(),
      tokens: const AuthTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
    );
  final fakeStorage = FakeSecureStorageService();

  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(fakeAuthRepo),
      secureStorageServiceProvider.overrideWithValue(fakeStorage),
      childRepositoryProvider.overrideWithValue(fakeChildren),
    ],
  );
  addTearDown(container.dispose);

  await container.read(authControllerProvider.future); // resolve as logged-out first
  await container.read(authControllerProvider.notifier).login('jamie@example.com', 'StrongPass123');
  return container;
}

void main() {
  group('Child switching', () {
    test('defaults to the first child when none has been chosen yet', () async {
      final fakeChildren = FakeChildRepository()..children = [_child('child-mia', 'Mia'), _child('child-leo', 'Leo')];
      final container = await _buildLoggedInContainer(fakeChildren);

      await container.read(childrenControllerProvider.future);

      expect(container.read(activeChildProvider)?.displayName, 'Mia');
    });

    test('switches the active child when another child is selected', () async {
      final fakeChildren = FakeChildRepository()..children = [_child('child-mia', 'Mia'), _child('child-leo', 'Leo')];
      final container = await _buildLoggedInContainer(fakeChildren);
      await container.read(childrenControllerProvider.future);
      expect(container.read(activeChildProvider)?.displayName, 'Mia');

      await container.read(activeChildIdControllerProvider.notifier).setActiveChildId('child-leo', 'user-1');

      expect(container.read(activeChildProvider)?.displayName, 'Leo');
    });

    test('persists the choice to SharedPreferences keyed by the logged-in user id', () async {
      final fakeChildren = FakeChildRepository()..children = [_child('child-mia', 'Mia'), _child('child-leo', 'Leo')];
      final container = await _buildLoggedInContainer(fakeChildren);
      await container.read(childrenControllerProvider.future);

      await container.read(activeChildIdControllerProvider.notifier).setActiveChildId('child-leo', 'user-1');

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('kqk.activeChildId.user-1'), 'child-leo');
    });

    test('falls back to the first child if the persisted choice no longer exists', () async {
      SharedPreferences.setMockInitialValues({'kqk.activeChildId.user-1': 'child-that-was-deleted'});
      final fakeChildren = FakeChildRepository()..children = [_child('child-mia', 'Mia'), _child('child-leo', 'Leo')];

      final fakeAuthRepo = FakeAuthRepository()
        ..onLogin = (email, password) async => LoginResult(
          user: _fakeUser(),
          tokens: const AuthTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );
      final fakeStorage = FakeSecureStorageService();
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(fakeAuthRepo),
          secureStorageServiceProvider.overrideWithValue(fakeStorage),
          childRepositoryProvider.overrideWithValue(fakeChildren),
        ],
      );
      addTearDown(container.dispose);
      await container.read(authControllerProvider.future);
      await container.read(authControllerProvider.notifier).login('jamie@example.com', 'StrongPass123');

      await container.read(childrenControllerProvider.future);

      expect(container.read(activeChildProvider)?.displayName, 'Mia');
    });

    test('returns null when the family has no children yet', () async {
      final fakeChildren = FakeChildRepository()..children = [];
      final container = await _buildLoggedInContainer(fakeChildren);
      await container.read(childrenControllerProvider.future);

      expect(container.read(activeChildProvider), isNull);
    });
  });
}
