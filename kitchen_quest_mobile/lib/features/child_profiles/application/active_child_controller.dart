import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../models/child_profile.dart';
import '../../../shared/providers/core_providers.dart';
import '../../auth/application/auth_controller.dart';
import '../data/child_repository.dart';

final childRepositoryProvider = Provider<ChildRepository>((ref) {
  return ChildRepository(ref.watch(apiClientProvider));
});

/// The list of children is server state -- fetched once per session and
/// refreshed explicitly after any create/update/delete, exactly like the
/// web app's React-Query-backed `children` list. This is a plain
/// AsyncNotifier rather than a caching library because the app has a
/// small enough surface (one list, invalidated in only a few places) that
/// pulling in a query-caching dependency wouldn't buy much -- see
/// docs/ARCHITECTURE.md's state-management section for the fuller
/// reasoning.
class ChildrenController extends AsyncNotifier<List<ChildProfile>> {
  @override
  FutureOr<List<ChildProfile>> build() async {
    final user = ref.watch(authControllerProvider).valueOrNull;
    if (user == null) return const [];

    final list = await ref.watch(childRepositoryProvider).listChildren();
    // Restore (or default) which child is "active" now that we know both
    // who's logged in and what children exist.
    await ref.read(activeChildIdControllerProvider.notifier).restoreForUser(user.id, list);
    return list;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(childRepositoryProvider).listChildren());
  }
}

final childrenControllerProvider = AsyncNotifierProvider<ChildrenController, List<ChildProfile>>(ChildrenController.new);

/// Which child is currently being viewed/acted on, persisted to
/// SharedPreferences *keyed by user id* -- refreshing the app doesn't
/// reset the selection, and switching parent accounts on the same device
/// never leaks the wrong family's active child into a new session.
/// Mirrors the web app's ActiveChildContext exactly, including its
/// distinction from `POST /children/:id/activate` (the device-handoff
/// endpoint for actual play surfaces, untouched by this class).
class ActiveChildIdController extends Notifier<String?> {
  @override
  String? build() => null;

  String _storageKey(String userId) => 'kqk.activeChildId.$userId';

  Future<void> restoreForUser(String userId, List<ChildProfile> children) async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_storageKey(userId));
    final validStored = stored != null && children.any((c) => c.id == stored);
    state = validStored ? stored : (children.isEmpty ? null : children.first.id);
  }

  Future<void> setActiveChildId(String id, String userId) async {
    state = id;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey(userId), id);
  }
}

final activeChildIdControllerProvider = NotifierProvider<ActiveChildIdController, String?>(ActiveChildIdController.new);

/// Convenience derived provider -- the actual ChildProfile object for
/// whatever id is currently active, or null if there are no children yet.
final activeChildProvider = Provider<ChildProfile?>((ref) {
  final children = ref.watch(childrenControllerProvider).valueOrNull ?? const [];
  if (children.isEmpty) return null;
  final activeId = ref.watch(activeChildIdControllerProvider);
  for (final child in children) {
    if (child.id == activeId) return child;
  }
  return children.first;
});
