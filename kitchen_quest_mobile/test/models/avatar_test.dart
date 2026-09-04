import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/avatar.dart';

void main() {
  group('AvatarCatalog.fromJson', () {
    test('parses cosmetics alongside characters and colors', () {
      final catalog = AvatarCatalog.fromJson({
        'characters': [
          {'_id': 'char-1', 'characterId': 'chef', 'label': 'Chef', 'emoji': '🧑‍🍳'},
        ],
        'colors': [
          {'id': 'primary', 'label': 'Tomato'},
        ],
        'cosmetics': [
          {'_id': 'cosmetic-1', 'label': 'Basic Bandana', 'slot': 'hat', 'assetKey': 'bandana', 'unlocked': true},
          {'_id': 'cosmetic-2', 'label': 'Gold Crown', 'slot': 'hat', 'assetKey': 'crown', 'unlocked': false},
        ],
      });

      expect(catalog.characters, hasLength(1));
      expect(catalog.colors, hasLength(1));
      expect(catalog.cosmetics, hasLength(2));
      expect(catalog.cosmetics.first.slot, 'hat');
      expect(catalog.cosmetics.first.unlocked, true);
      expect(catalog.cosmetics[1].unlocked, false);
    });

    test('defaults cosmetics to an empty list when absent (backward compatible with a childId-less request)', () {
      final catalog = AvatarCatalog.fromJson({
        'characters': [],
        'colors': [],
      });

      expect(catalog.cosmetics, isEmpty);
    });

    test('cosmetics omit the unlocked flag entirely when no childId was in the request', () {
      final catalog = AvatarCatalog.fromJson({
        'characters': [],
        'colors': [],
        'cosmetics': [
          {'_id': 'cosmetic-1', 'label': 'Basic Bandana', 'slot': 'hat', 'assetKey': 'bandana'},
        ],
      });

      expect(catalog.cosmetics.first.unlocked, isNull);
    });
  });
}
