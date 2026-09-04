import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../core/failures.dart';
import '../../../models/grocery_list.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../application/grocery_controller.dart';

/// Family-scoped (not per-child, matching grocery.service.js's contract
/// exactly -- no childId anywhere in this feature). Offline-aware: an
/// amber banner shows when the device has no connection, checkbox
/// toggles keep working locally and queue for later sync (see
/// GroceryController's doc comment for the full design), and a listener
/// on isOnlineProvider triggers a sync the moment connectivity returns
/// rather than waiting for the next manual refresh.
class GroceryListScreen extends ConsumerStatefulWidget {
  const GroceryListScreen({super.key});

  @override
  ConsumerState<GroceryListScreen> createState() => _GroceryListScreenState();
}

class _GroceryListScreenState extends ConsumerState<GroceryListScreen> {
  final _newItemController = TextEditingController();
  bool _adding = false;
  late bool _wasOnline;

  @override
  void initState() {
    super.initState();
    // Seeded from the current value so the very first genuine
    // offline-to-online transition is correctly detected -- ref.listen
    // only fires on *changes*, not for the value already in effect when
    // the listener is registered, so leaving this null until the first
    // callback would miss exactly the transition this screen cares most
    // about (a child using the app while a connection drops and comes
    // back mid-session).
    _wasOnline = ref.read(isOnlineProvider).valueOrNull ?? true;
  }

  @override
  void dispose() {
    _newItemController.dispose();
    super.dispose();
  }

  Future<void> _handleAddItem() async {
    final name = _newItemController.text.trim();
    if (name.isEmpty) return;
    setState(() => _adding = true);
    try {
      await ref.read(groceryControllerProvider.notifier).addCustomItem(name);
      _newItemController.clear();
    } catch (err) {
      _showMessage(err is NetworkUnavailableFailure ? "Adding items needs an internet connection." : ErrorState.messageFor(err));
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<void> _handleRemove(String itemId) async {
    try {
      await ref.read(groceryControllerProvider.notifier).removeItem(itemId);
    } catch (err) {
      _showMessage(err is NetworkUnavailableFailure ? "Removing items needs an internet connection." : ErrorState.messageFor(err));
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final groceryAsync = ref.watch(groceryControllerProvider);

    // Fires a sync the moment connectivity flips from offline to online
    // -- otherwise a queued toggle would sit unsynced until the user
    // happens to reopen this screen.
    ref.listen(isOnlineProvider, (previous, next) {
      final isOnlineNow = next.valueOrNull ?? false;
      if (!_wasOnline && isOnlineNow) {
        ref.read(groceryControllerProvider.notifier).syncPendingToggles();
      }
      _wasOnline = isOnlineNow;
    });

    final isOnline = ref.watch(isOnlineProvider).valueOrNull ?? true;

    return Scaffold(
      appBar: AppBar(title: const Text('Grocery List')),
      body: Column(
        children: [
          if (!isOnline)
            Container(
              width: double.infinity,
              color: AppColors.secondary.withOpacity(0.3),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              child: const Text(
                "You're offline. Checkbox changes are saved and will sync automatically.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _newItemController,
                    decoration: const InputDecoration(hintText: 'Add an item...'),
                    onSubmitted: (_) => _handleAddItem(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _adding ? null : _handleAddItem,
                  child: Text(_adding ? 'Adding...' : 'Add'),
                ),
              ],
            ),
          ),
          Expanded(
            child: groceryAsync.when(
              loading: () => const LoadingState(label: 'Loading your grocery list...'),
              error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
              data: (list) => _GroceryItemsList(list: list, onToggle: _toggle, onRemove: _handleRemove),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _toggle(String itemId, bool checked) {
    return ref.read(groceryControllerProvider.notifier).toggleItem(itemId, checked);
  }
}

class _GroceryItemsList extends StatelessWidget {
  const _GroceryItemsList({required this.list, required this.onToggle, required this.onRemove});

  final GroceryList list;
  final Future<void> Function(String itemId, bool checked) onToggle;
  final Future<void> Function(String itemId) onRemove;

  @override
  Widget build(BuildContext context) {
    if (list.items.isEmpty) {
      return const EmptyState(
        icon: '🛒',
        title: 'Your grocery list is empty',
        description: 'Add ingredients from a recipe, or type in something above.',
      );
    }

    final needed = list.items.where((i) => !i.checked).toList();
    final checked = list.items.where((i) => i.checked).toList();
    final grouped = <String, List<GroceryItem>>{};
    for (final item in needed) {
      grouped.putIfAbsent(item.category, () => []).add(item);
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        for (final entry in grouped.entries) ...[
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              entry.key,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4)),
            ),
          ),
          for (final item in entry.value) _ItemTile(item: item, onToggle: onToggle, onRemove: onRemove),
        ],
        if (checked.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Checked off (${checked.length})',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4)),
            ),
          ),
          for (final item in checked) _ItemTile(item: item, onToggle: onToggle, onRemove: onRemove),
        ],
        const SizedBox(height: 24),
      ],
    );
  }
}

class _ItemTile extends StatelessWidget {
  const _ItemTile({required this.item, required this.onToggle, required this.onRemove});

  final GroceryItem item;
  final Future<void> Function(String itemId, bool checked) onToggle;
  final Future<void> Function(String itemId) onRemove;

  @override
  Widget build(BuildContext context) {
    final qty = item.quantity != null ? ' (${item.quantity}${item.unit != null ? ' ${item.unit}' : ''})' : '';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(color: AppColors.foreground.withOpacity(0.05), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Checkbox(value: item.checked, onChanged: (v) => onToggle(item.id, v ?? false)),
          Expanded(
            child: Text(
              '${item.name}$qty',
              style: TextStyle(
                decoration: item.checked ? TextDecoration.lineThrough : null,
                color: item.checked ? AppColors.foreground.withOpacity(0.4) : AppColors.foreground,
              ),
            ),
          ),
          if (item.custom)
            Container(
              margin: const EdgeInsets.only(right: 4),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: AppColors.foreground.withOpacity(0.1), borderRadius: BorderRadius.circular(999)),
              child: const Text('Custom', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
            ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            tooltip: 'Remove ${item.name}',
            onPressed: () => onRemove(item.id),
          ),
        ],
      ),
    );
  }
}
