import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/grocery_list.dart';

void main() {
  group('GroceryList / GroceryItem JSON round-trip', () {
    test('parses a full list matching the real backend shape', () {
      final list = GroceryList.fromJson({
        '_id': 'list-1',
        'items': [
          {'_id': 'item-1', 'name': 'Apples', 'quantity': 3, 'unit': 'count', 'category': 'Produce', 'checked': false, 'custom': false},
          {'_id': 'item-2', 'name': 'Bananas', 'category': 'Produce', 'checked': true, 'custom': true},
        ],
      });

      expect(list.items, hasLength(2));
      expect(list.items.first.name, 'Apples');
      expect(list.items.first.quantity, 3);
      expect(list.items[1].custom, true);
      expect(list.items[1].checked, true);
    });

    test('defaults category to "Other" and checked/custom to false when absent', () {
      final list = GroceryList.fromJson({
        '_id': 'list-1',
        'items': [
          {'_id': 'item-1', 'name': 'Mystery item'},
        ],
      });

      expect(list.items.first.category, 'Other');
      expect(list.items.first.checked, false);
      expect(list.items.first.custom, false);
    });

    test('round-trips through toJson without losing data', () {
      final original = GroceryList.fromJson({
        '_id': 'list-1',
        'items': [
          {'_id': 'item-1', 'name': 'Apples', 'quantity': 3, 'unit': 'count', 'category': 'Produce', 'checked': false, 'custom': false},
        ],
      });

      final roundTripped = GroceryList.fromJson(original.toJson());
      expect(roundTripped.items.first.name, 'Apples');
      expect(roundTripped.items.first.quantity, 3);
    });
  });

  group('GroceryList.withItemChecked', () {
    test('updates only the targeted item, leaving others untouched', () {
      final list = GroceryList.fromJson({
        '_id': 'list-1',
        'items': [
          {'_id': 'item-1', 'name': 'Apples', 'category': 'Produce', 'checked': false, 'custom': false},
          {'_id': 'item-2', 'name': 'Milk', 'category': 'Dairy', 'checked': false, 'custom': false},
        ],
      });

      final updated = list.withItemChecked('item-1', true);

      expect(updated.items.firstWhere((i) => i.id == 'item-1').checked, true);
      expect(updated.items.firstWhere((i) => i.id == 'item-2').checked, false);
    });

    test('is a no-op (returns an equivalent list) for an id that does not exist', () {
      final list = GroceryList.fromJson({
        '_id': 'list-1',
        'items': [
          {'_id': 'item-1', 'name': 'Apples', 'category': 'Produce', 'checked': false, 'custom': false},
        ],
      });

      final updated = list.withItemChecked('does-not-exist', true);
      expect(updated.items.first.checked, false);
    });
  });
}
