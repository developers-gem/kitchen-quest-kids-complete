import '../../../models/grocery_list.dart';
import '../../../services/api_client.dart';

/// Mirrors the web app's api/grocery.ts -- same 4-endpoint contract,
/// verified against grocery.service.js directly. Deliberately thin: all
/// offline-awareness (caching, the pending-toggle queue) lives one layer
/// up in GroceryController, not here -- this repository only knows how
/// to talk to the real API, matching every other repository in this app.
class GroceryRepository {
  GroceryRepository(this._client);

  final ApiClient _client;

  Future<GroceryList> getActiveList() async {
    final data = await _client.get<Map<String, dynamic>>('/grocery');
    return GroceryList.fromJson(data);
  }

  Future<GroceryList> addCustomItem({required String name, double? quantity, String? unit, String? category}) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/grocery/items',
      body: {'name': name, if (quantity != null) 'quantity': quantity, if (unit != null) 'unit': unit, if (category != null) 'category': category},
    );
    return GroceryList.fromJson(data);
  }

  Future<GroceryList> setItemChecked(String itemId, bool checked) async {
    final data = await _client.patch<Map<String, dynamic>>('/grocery/items/$itemId', body: {'checked': checked});
    return GroceryList.fromJson(data);
  }

  Future<GroceryList> removeItem(String itemId) async {
    final data = await _client.delete<Map<String, dynamic>>('/grocery/items/$itemId');
    return GroceryList.fromJson(data);
  }
}
