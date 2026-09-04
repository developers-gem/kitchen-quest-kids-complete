import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants.dart';
import '../../../core/failures.dart';
import '../../../models/avatar.dart';
import '../../../models/child_profile.dart';
import '../../../shared/widgets/avatar_selector.dart';
import '../../../shared/widgets/parental_gate_dialog.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../application/active_child_controller.dart';

class ManageChildrenScreen extends ConsumerWidget {
  const ManageChildrenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final childrenAsync = ref.watch(childrenControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage your chefs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1),
            tooltip: 'Add a chef',
            onPressed: () async {
              final ok = await ensureParentalGate(context, ref);
              if (!ok || !context.mounted) return;
              await showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                builder: (_) => const _ChildEditorSheet(),
              );
            },
          ),
        ],
      ),
      body: childrenAsync.when(
        loading: () => const LoadingState(),
        error: (err, _) => ErrorState(
          message: ErrorState.messageFor(err),
          onRetry: () => ref.read(childrenControllerProvider.notifier).refresh(),
        ),
        data: (children) {
          if (children.isEmpty) {
            return EmptyState(
              title: 'No chefs yet!',
              description: 'Add a child profile to start their food adventure.',
              icon: '🧑‍🍳',
              action: ElevatedButton(
                onPressed: () async {
                  final ok = await ensureParentalGate(context, ref);
                  if (!ok || !context.mounted) return;
                  await showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => const _ChildEditorSheet(),
                  );
                },
                child: const Text('Add your first chef'),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: children.length,
            itemBuilder: (context, index) {
              final child = children[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: CircleAvatar(backgroundColor: toneColor(child.avatarColor), radius: 22),
                  title: Text(child.displayName, style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: Text('Ages ${child.ageRange} · Level ${child.currentLevel}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined),
                        tooltip: 'Edit ${child.displayName}',
                        onPressed: () async {
                          final ok = await ensureParentalGate(context, ref);
                          if (!ok || !context.mounted) return;
                          await showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            builder: (_) => _ChildEditorSheet(existing: child),
                          );
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        tooltip: 'Remove ${child.displayName}',
                        onPressed: () => _confirmDelete(context, ref, child),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, ChildProfile child) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Remove ${child.displayName}?'),
        content: const Text("Their progress history is kept, but they'll disappear from the switcher."),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Remove')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final ok = await ensureParentalGate(context, ref);
    if (!ok) return;

    try {
      await ref.read(childRepositoryProvider).deleteChild(child.id);
      await ref.read(childrenControllerProvider.notifier).refresh();
    } catch (err) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ErrorState.messageFor(err))));
      }
    }
  }
}

class _ChildEditorSheet extends ConsumerStatefulWidget {
  const _ChildEditorSheet({this.existing});

  final ChildProfile? existing;

  @override
  ConsumerState<_ChildEditorSheet> createState() => _ChildEditorSheetState();
}

class _ChildEditorSheetState extends ConsumerState<_ChildEditorSheet> {
  late final TextEditingController _nameController;
  late String _ageRange;
  String? _avatarConfigId;
  late String _avatarColor;
  AvatarCatalog? _catalog;
  String? _error;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _nameController = TextEditingController(text: existing?.displayName ?? '');
    _ageRange = existing?.ageRange ?? AgeRanges.all.first;
    _avatarConfigId = existing?.avatarConfigId;
    _avatarColor = existing?.avatarColor ?? 'primary';
    _loadCatalog();
  }

  Future<void> _loadCatalog() async {
    final catalog = await ref.read(childRepositoryProvider).getAvatarCatalog(childId: widget.existing?.id);
    if (!mounted) return;
    setState(() {
      _catalog = catalog;
      _avatarConfigId ??= catalog.characters.isNotEmpty ? catalog.characters.first.id : null;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final repo = ref.read(childRepositoryProvider);
      if (widget.existing == null) {
        await repo.createChild(
          displayName: _nameController.text.trim(),
          ageRange: _ageRange,
          avatarConfigId: _avatarConfigId,
          avatarColor: _avatarColor,
        );
      } else {
        await repo.updateChild(
          widget.existing!.id,
          displayName: _nameController.text.trim(),
          ageRange: _ageRange,
          avatarConfigId: _avatarConfigId,
          avatarColor: _avatarColor,
        );
      }
      await ref.read(childrenControllerProvider.notifier).refresh();
      if (mounted) Navigator.of(context).pop();
    } on ApiFailure catch (err) {
      setState(() => _error = err.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = _catalog;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.existing == null ? 'New chef' : 'Edit chef',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              maxLength: 40,
              decoration: const InputDecoration(labelText: 'First name'),
              onChanged: (_) => setState(() {}),
            ),
            Wrap(
              spacing: 8,
              children: AgeRanges.all.map((range) {
                return ChoiceChip(
                  label: Text(range),
                  selected: _ageRange == range,
                  onSelected: (_) => setState(() => _ageRange = range),
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            if (catalog == null)
              const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: LoadingState())
            else
              AvatarSelector(
                catalog: catalog,
                selectedCharacterId: _avatarConfigId,
                selectedColor: _avatarColor,
                onSelectCharacter: (id) => setState(() => _avatarConfigId = id),
                onSelectColor: (id) => setState(() => _avatarColor = id),
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _saving || _nameController.text.trim().isEmpty ? null : _save,
                    child: Text(_saving ? 'Saving...' : 'Save'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
