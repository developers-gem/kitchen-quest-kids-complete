import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/region.dart';

void main() {
  group('RegionSummary.fromJson', () {
    test('parses a published region with gameCount, not the stale "active" shape', () {
      final region = RegionSummary.fromJson({
        '_id': 'region-1',
        'name': 'New York',
        'slug': 'new-york',
        'scopeType': 'usState',
        'unlockOrder': 1,
        'gameCount': 3,
        'unlocked': true,
      });

      expect(region.name, 'New York');
      expect(region.gameCount, 3);
      expect(region.unlocked, true);
    });

    test('omits unlocked when no childId was in the request', () {
      final region = RegionSummary.fromJson({
        '_id': 'region-1',
        'name': 'New York',
        'slug': 'new-york',
        'scopeType': 'usState',
        'unlockOrder': 1,
        'gameCount': 3,
      });

      expect(region.unlocked, isNull);
    });
  });

  group('RegionDetail.fromJson', () {
    test('parses the games list for a region', () {
      final detail = RegionDetail.fromJson({
        '_id': 'region-1',
        'name': 'New York',
        'slug': 'new-york',
        'scopeType': 'usState',
        'unlockOrder': 1,
        'games': [
          {'_id': 'game-1', 'title': 'Big Apple Crunch', 'slug': 'big-apple-crunch', 'gameType': 'quiz'},
        ],
        'unlocked': true,
      });

      expect(detail.games, hasLength(1));
      expect(detail.games.first.title, 'Big Apple Crunch');
    });

    test('handles a region with no games yet without throwing', () {
      final detail = RegionDetail.fromJson({
        '_id': 'region-1',
        'name': 'New York',
        'slug': 'new-york',
        'scopeType': 'usState',
        'unlockOrder': 1,
      });

      expect(detail.games, isEmpty);
    });
  });
}
