import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Backs the "offline-friendly grocery checklist" requirement.
///
/// Design: the grocery list is cached as JSON on every successful fetch.
/// While offline, the grocery screen reads from this cache and queues
/// check/uncheck toggles locally (see [queuePendingToggle]); when
/// connectivity returns, the grocery repository (built in Phase 5) drains
/// the queue against the real API and re-fetches the authoritative list.
///
/// This is intentionally simple (SharedPreferences + JSON), not a full
/// offline-first sync engine with conflict resolution -- a grocery
/// checklist has a narrow, low-stakes conflict surface (worst case: an
/// item briefly shows the wrong checked state until the queue drains),
/// which doesn't justify a heavier local-database + merge-strategy
/// architecture. If offline usage patterns show real conflicts in
/// practice, upgrading the storage layer here doesn't change the
/// repository's public interface.
class OfflineCacheService {
  static const _groceryListKey = 'kqk.cache.groceryList';
  static const _pendingTogglesKey = 'kqk.cache.groceryPendingToggles';

  Future<void> cacheGroceryList(Map<String, dynamic> groceryListJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_groceryListKey, jsonEncode(groceryListJson));
  }

  Future<Map<String, dynamic>?> readCachedGroceryList() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_groceryListKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  /// Queues a checkbox toggle made while offline. `itemId` -> `checked`.
  Future<void> queuePendingToggle(String itemId, bool checked) async {
    final prefs = await SharedPreferences.getInstance();
    final pending = await _readPendingToggles(prefs);
    pending[itemId] = checked;
    await prefs.setString(_pendingTogglesKey, jsonEncode(pending));
  }

  Future<Map<String, bool>> readPendingToggles() async {
    final prefs = await SharedPreferences.getInstance();
    return _readPendingToggles(prefs);
  }

  Future<void> clearPendingToggles() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingTogglesKey);
  }

  Future<Map<String, bool>> _readPendingToggles(SharedPreferences prefs) async {
    final raw = prefs.getString(_pendingTogglesKey);
    if (raw == null) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((key, value) => MapEntry(key, value as bool));
  }
}
