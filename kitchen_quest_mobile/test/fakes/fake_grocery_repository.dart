import 'package:kitchen_quest_mobile/features/grocery/data/grocery_repository.dart';
import 'package:kitchen_quest_mobile/models/grocery_list.dart';

/// Configurable fake, same pattern as fake_auth_repository.dart --
/// each method has a matching nullable callback so a test only stubs
/// what it actually exercises.
class FakeGroceryRepository implements GroceryRepository {
  Future<GroceryList> Function()? onGetActiveList;
  Future<GroceryList> Function(String itemId, bool checked)? onSetItemChecked;
  Future<GroceryList> Function(String name)? onAddCustomItem;
  Future<GroceryList> Function(String itemId)? onRemoveItem;

  @override
  Future<GroceryList> getActiveList() {
    if (onGetActiveList == null) throw StateError('FakeGroceryRepository.getActiveList not stubbed for this test');
    return onGetActiveList!();
  }

  @override
  Future<GroceryList> setItemChecked(String itemId, bool checked) {
    if (onSetItemChecked == null) throw StateError('FakeGroceryRepository.setItemChecked not stubbed for this test');
    return onSetItemChecked!(itemId, checked);
  }

  @override
  Future<GroceryList> addCustomItem({required String name, double? quantity, String? unit, String? category}) {
    if (onAddCustomItem == null) throw StateError('FakeGroceryRepository.addCustomItem not stubbed for this test');
    return onAddCustomItem!(name);
  }

  @override
  Future<GroceryList> removeItem(String itemId) {
    if (onRemoveItem == null) throw StateError('FakeGroceryRepository.removeItem not stubbed for this test');
    return onRemoveItem!(itemId);
  }
}
