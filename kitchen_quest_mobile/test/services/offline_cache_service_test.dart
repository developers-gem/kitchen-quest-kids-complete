import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kitchen_quest_mobile/services/offline_cache_service.dart';

/// The grocery *screen* itself is a later phase (see docs/ARCHITECTURE.md),
/// but the offline-caching mechanism it will rely on is already built and
/// is exactly what "grocery offline behavior" testing means today: can a
/// list survive being cached, and does the pending-toggle queue correctly
/// accumulate and clear. These tests exercise that mechanism directly
/// rather than a not-yet-existing screen.
void main() {
  late OfflineCacheService service;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    service = OfflineCacheService();
  });

  group('Grocery list caching', () {
    test('returns null when nothing has been cached yet', () async {
      expect(await service.readCachedGroceryList(), isNull);
    });

    test('round-trips a cached grocery list exactly', () async {
      final list = {
        '_id': 'list-1',
        'items': [
          {'_id': 'item-1', 'name': 'Apples', 'checked': false},
          {'_id': 'item-2', 'name': 'Milk', 'checked': true},
        ],
      };

      await service.cacheGroceryList(list);
      final result = await service.readCachedGroceryList();

      expect(result, isNotNull);
      expect(result!['_id'], 'list-1');
      expect((result['items'] as List).length, 2);
    });

    test('overwrites the previous cache on a fresh fetch rather than merging', () async {
      await service.cacheGroceryList({'_id': 'list-1', 'items': []});
      await service.cacheGroceryList({'_id': 'list-2', 'items': []});

      final result = await service.readCachedGroceryList();
      expect(result!['_id'], 'list-2');
    });
  });

  group('Offline toggle queue', () {
    test('has an empty queue before anything is toggled offline', () async {
      expect(await service.readPendingToggles(), isEmpty);
    });

    test('queues a checkbox toggle made while offline', () async {
      await service.queuePendingToggle('item-1', true);
      final pending = await service.readPendingToggles();

      expect(pending, {'item-1': true});
    });

    test('accumulates multiple distinct items toggled while offline', () async {
      await service.queuePendingToggle('item-1', true);
      await service.queuePendingToggle('item-2', false);

      final pending = await service.readPendingToggles();
      expect(pending, {'item-1': true, 'item-2': false});
    });

    test('the latest toggle for the same item wins (no duplicate/conflicting entries)', () async {
      await service.queuePendingToggle('item-1', true);
      await service.queuePendingToggle('item-1', false);

      final pending = await service.readPendingToggles();
      expect(pending, {'item-1': false});
    });

    test('clears the entire queue once drained (e.g. after reconnecting and syncing)', () async {
      await service.queuePendingToggle('item-1', true);
      await service.queuePendingToggle('item-2', true);

      await service.clearPendingToggles();

      expect(await service.readPendingToggles(), isEmpty);
    });
  });
}
