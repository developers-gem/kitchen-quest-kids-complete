/// Matches groceryList.model.js's GroceryItem subdocument exactly.
class GroceryItem {
  const GroceryItem({
    required this.id,
    required this.name,
    this.quantity,
    this.unit,
    required this.category,
    required this.checked,
    required this.custom,
  });

  final String id;
  final String name;
  final double? quantity;
  final String? unit;
  final String category;
  final bool checked;
  final bool custom;

  factory GroceryItem.fromJson(Map<String, dynamic> json) {
    return GroceryItem(
      id: json['_id'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num?)?.toDouble(),
      unit: json['unit'] as String?,
      category: json['category'] as String? ?? 'Other',
      checked: json['checked'] as bool? ?? false,
      custom: json['custom'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'quantity': quantity,
        'unit': unit,
        'category': category,
        'checked': checked,
        'custom': custom,
      };

  GroceryItem copyWith({bool? checked}) {
    return GroceryItem(
      id: id,
      name: name,
      quantity: quantity,
      unit: unit,
      category: category,
      checked: checked ?? this.checked,
      custom: custom,
    );
  }
}

class GroceryList {
  const GroceryList({required this.id, required this.items});

  final String id;
  final List<GroceryItem> items;

  factory GroceryList.fromJson(Map<String, dynamic> json) {
    return GroceryList(
      id: json['_id'] as String,
      items: (json['items'] as List<dynamic>? ?? const []).map((e) => GroceryItem.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {'_id': id, 'items': items.map((i) => i.toJson()).toList()};

  GroceryList withItemChecked(String itemId, bool checked) {
    return GroceryList(
      id: id,
      items: items.map((i) => i.id == itemId ? i.copyWith(checked: checked) : i).toList(),
    );
  }
}
