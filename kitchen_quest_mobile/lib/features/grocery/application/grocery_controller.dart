import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/failures.dart';
import '../../../models/grocery_list.dart';
import '../../../services/offline_cache_service.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/grocery_repository.dart';

final groceryRepositoryProvider = Provider<GroceryRepository>((ref) {
  return GroceryRepository(ref.watch(apiClientProvider));
});

/// The offline-aware heart of the grocery feature -- this is where
/// OfflineCacheService (built in Phase 1, unused until now) actually
/// gets exercised. Three behaviors, matching the architecture's
/// original intent exactly:
///
/// 1. On load: try the real API; on success, cache it AND drain any
///    toggles queued from a previous offline session. On
///    NetworkUnavailableFailure, fall back to the cached list with
///    pending toggles overlaid, so a child reopening the app while still
///    offline sees their own unsynced taps, not stale server state.
/// 2. Toggling an item while offline never fails or is lost: it's
///    applied optimistically to local state immediately (so the
///    checkbox visibly responds) and queued for the next sync.
/// 3. Adding/removing items requires connectivity (no queueing) -- the
///    offline cache service was deliberately scoped to toggles only
///    (see offline_cache_service.dart's own doc comment on why: a
///    grocery checklist's conflict surface is narrow enough that
///    queueing full CRUD wasn't worth the complexity). Callers should
///    catch NetworkUnavailableFailure from these two methods and tell
///    the user plainly that this action needs a connection.
class GroceryController extends AsyncNotifier<GroceryList> {
  late final GroceryRepository _repo;

  @override
  FutureOr<GroceryList> build() async {
    _repo = ref.watch(groceryRepositoryProvider);
    final cache = ref.watch(offlineCacheServiceProvider);
    return _loadInitial(cache);
  }

  Future<GroceryList> _loadInitial(OfflineCacheService cache) async {
    try {
      final list = await _repo.getActiveList();
      await cache.cacheGroceryList(list.toJson());

      final pending = await cache.readPendingToggles();
      if (pending.isNotEmpty) {
        return _drainPendingToggles(pending, list, cache);
      }
      return list;
    } on NetworkUnavailableFailure {
      final cached = await cache.readCachedGroceryList();
      if (cached == null) rethrow;

      var list = GroceryList.fromJson(cached);
      final pending = await cache.readPendingToggles();
      for (final entry in pending.entries) {
        list = list.withItemChecked(entry.key, entry.value);
      }
      return list;
    }
  }

  Future<GroceryList> _drainPendingToggles(Map<String, bool> pending, GroceryList base, OfflineCacheService cache) async {
    GroceryList current = base;
    for (final entry in pending.entries) {
      try {
        // Sequential on purpose: each toggle call returns the
        // authoritative full list, so applying them one at a time (not
        // in parallel) avoids a later response clobbering an earlier one.
        current = await _repo.setItemChecked(entry.key, entry.value);
      } catch (_) {
        // Leave this one for the next sync attempt (e.g. the item was
        // deleted server-side while offline -- not fatal to the rest).
      }
    }
    await cache.clearPendingToggles();
    await cache.cacheGroceryList(current.toJson());
    return current;
  }

  Future<void> toggleItem(String itemId, bool checked) async {
    final currentList = state.valueOrNull;
    if (currentList == null) return;
    final cache = ref.read(offlineCacheServiceProvider);

    try {
      final updated = await _repo.setItemChecked(itemId, checked);
      state = AsyncData(updated);
      await cache.cacheGroceryList(updated.toJson());
    } on NetworkUnavailableFailure {
      final optimistic = currentList.withItemChecked(itemId, checked);
      state = AsyncData(optimistic);
      await cache.queuePendingToggle(itemId, checked);
      await cache.cacheGroceryList(optimistic.toJson());
    }
  }

  Future<void> addCustomItem(String name) async {
    final updated = await _repo.addCustomItem(name: name);
    state = AsyncData(updated);
    await ref.read(offlineCacheServiceProvider).cacheGroceryList(updated.toJson());
  }

  Future<void> removeItem(String itemId) async {
    final updated = await _repo.removeItem(itemId);
    state = AsyncData(updated);
    await ref.read(offlineCacheServiceProvider).cacheGroceryList(updated.toJson());
  }

  /// Called when connectivity is restored (see grocery_list_screen.dart's
  /// listener on isOnlineProvider) -- drains any toggles queued while
  /// offline against the real API.
  Future<void> syncPendingToggles() async {
    final cache = ref.read(offlineCacheServiceProvider);
    final pending = await cache.readPendingToggles();
    if (pending.isEmpty) return;
    final currentList = state.valueOrNull;
    if (currentList == null) return;
    final synced = await _drainPendingToggles(pending, currentList, cache);
    state = AsyncData(synced);
  }
}

final groceryControllerProvider = AsyncNotifierProvider<GroceryController, GroceryList>(GroceryController.new);
