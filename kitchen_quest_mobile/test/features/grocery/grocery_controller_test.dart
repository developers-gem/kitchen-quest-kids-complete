import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kitchen_quest_mobile/core/failures.dart';
import 'package:kitchen_quest_mobile/features/grocery/application/grocery_controller.dart';
import 'package:kitchen_quest_mobile/models/grocery_list.dart';
import '../../fakes/fake_grocery_repository.dart';

GroceryList _list(List<GroceryItem> items) => GroceryList(id: 'list-1', items: items);

GroceryItem _item(String id, {String name = 'Apples', bool checked = false}) =>
    GroceryItem(id: id, name: name, category: 'Produce', checked: checked, custom: false);

ProviderContainer _buildContainer(FakeGroceryRepository fakeRepo) {
  final container = ProviderContainer(overrides: [groceryRepositoryProvider.overrideWithValue(fakeRepo)]);
  addTearDown(container.dispose);
  return container;
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('GroceryController: loading', () {
    test('loads the real list when online and caches it', () async {
      final fakeRepo = FakeGroceryRepository()..onGetActiveList = () async => _list([_item('item-1')]);
      final container = _buildContainer(fakeRepo);

      final list = await container.read(groceryControllerProvider.future);

      expect(list.items, hasLength(1));
      expect(list.items.first.id, 'item-1');
    });

    test('falls back to the cached list when the network is unavailable', () async {
      // Seed the cache as if a previous successful load had happened.
      SharedPreferences.setMockInitialValues({
        'kqk.cache.groceryList': '{"_id":"list-1","items":[{"_id":"item-1","name":"Apples","category":"Produce","checked":false,"custom":false}]}',
      });

      final fakeRepo = FakeGroceryRepository()..onGetActiveList = () async => throw const NetworkUnavailableFailure();
      final container = _buildContainer(fakeRepo);

      final list = await container.read(groceryControllerProvider.future);

      expect(list.items, hasLength(1));
      expect(list.items.first.name, 'Apples');
    });

    test('overlays pending offline toggles onto the cached list on load', () async {
      SharedPreferences.setMockInitialValues({
        'kqk.cache.groceryList': '{"_id":"list-1","items":[{"_id":"item-1","name":"Apples","category":"Produce","checked":false,"custom":false}]}',
        'kqk.cache.groceryPendingToggles': '{"item-1":true}',
      });

      final fakeRepo = FakeGroceryRepository()..onGetActiveList = () async => throw const NetworkUnavailableFailure();
      final container = _buildContainer(fakeRepo);

      final list = await container.read(groceryControllerProvider.future);

      // The cached list itself said "unchecked", but the pending toggle
      // the user made while offline must win in what's displayed.
      expect(list.items.first.checked, true);
    });

    test('drains pending toggles against the real API as soon as a fresh load succeeds', () async {
      SharedPreferences.setMockInitialValues({'kqk.cache.groceryPendingToggles': '{"item-1":true}'});

      final syncCalls = <String>[];
      final fakeRepo = FakeGroceryRepository()
        ..onGetActiveList = () async => _list([_item('item-1', checked: false)])
        ..onSetItemChecked = (itemId, checked) async {
          syncCalls.add(itemId);
          return _list([_item('item-1', checked: checked)]);
        };
      final container = _buildContainer(fakeRepo);

      final list = await container.read(groceryControllerProvider.future);

      expect(syncCalls, ['item-1']);
      expect(list.items.first.checked, true);

      // The queue must be cleared after a successful drain -- otherwise
      // the same toggle would be re-sent forever.
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('kqk.cache.groceryPendingToggles'), isNull);
    });
  });

  group('GroceryController: toggling', () {
    test('applies the real server response when online', () async {
      final fakeRepo = FakeGroceryRepository()
        ..onGetActiveList = () async => _list([_item('item-1', checked: false)])
        ..onSetItemChecked = (itemId, checked) async => _list([_item('item-1', checked: checked)]);
      final container = _buildContainer(fakeRepo);
      await container.read(groceryControllerProvider.future);

      await container.read(groceryControllerProvider.notifier).toggleItem('item-1', true);

      expect(container.read(groceryControllerProvider).value!.items.first.checked, true);
    });

    test('never loses a toggle made while offline -- applies it optimistically and queues it', () async {
      final fakeRepo = FakeGroceryRepository()
        ..onGetActiveList = () async => _list([_item('item-1', checked: false)])
        ..onSetItemChecked = (itemId, checked) async => throw const NetworkUnavailableFailure();
      final container = _buildContainer(fakeRepo);
      await container.read(groceryControllerProvider.future);

      await container.read(groceryControllerProvider.notifier).toggleItem('item-1', true);

      // The UI-facing state reflects the tap immediately...
      expect(container.read(groceryControllerProvider).value!.items.first.checked, true);

      // ...and it's durably queued for the next sync, not just held in memory.
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('kqk.cache.groceryPendingToggles'), '{"item-1":true}');
    });
  });
}
