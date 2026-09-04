import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/recipes_controller.dart';

/// FIXED (gap investigation): added the "Add to grocery list" button --
/// mirrors the exact same fix applied to the web client. The backend
/// endpoint and now recipe_repository.dart's addToGroceryList method
/// both work; this screen was the missing piece connecting them.
class RecipeDetailScreen extends ConsumerStatefulWidget {
  const RecipeDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<RecipeDetailScreen> createState() => _RecipeDetailScreenState();
}

class _RecipeDetailScreenState extends ConsumerState<RecipeDetailScreen> {
  bool _addingToGrocery = false;
  String? _addedMessage;
  String? _addError;

  Future<void> _handleAddToGroceryList(String recipeId) async {
    setState(() {
      _addingToGrocery = true;
      _addError = null;
      _addedMessage = null;
    });
    try {
      await ref.read(recipeRepositoryProvider).addToGroceryList(recipeId);
      if (mounted) setState(() => _addedMessage = 'Added to your grocery list!');
    } catch (err) {
      if (mounted) setState(() => _addError = ErrorState.messageFor(err));
    } finally {
      if (mounted) setState(() => _addingToGrocery = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeChild = ref.watch(activeChildProvider);
    if (activeChild == null) return const Scaffold(body: LoadingState());

    final detailAsync = ref.watch(recipeDetailProvider((slug: widget.slug, childId: activeChild.id)));

    return Scaffold(
      appBar: AppBar(title: const Text('Recipe')),
      body: detailAsync.when(
        loading: () => const LoadingState(label: 'Loading recipe...'),
        error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
        data: (recipe) {
          if (recipe.unlocked == false) {
            return EmptyState(
              icon: '🔒',
              title: '${recipe.title} is locked',
              description: 'Keep playing and leveling up to unlock this recipe!',
              action: OutlinedButton(onPressed: () => context.pop(), child: const Text('Back to Recipes')),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Column(
                    children: [
                      const Text('🍽️', style: TextStyle(fontSize: 56)),
                      const SizedBox(height: 8),
                      Text(recipe.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900), textAlign: TextAlign.center),
                      const SizedBox(height: 6),
                      Text(recipe.description, textAlign: TextAlign.center, style: TextStyle(color: AppColors.foreground.withOpacity(0.6))),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  children: [
                    Chip(label: Text('${recipe.stepCount} steps')),
                    Chip(label: Text('${recipe.totalTimeMinutes} min')),
                    Chip(label: Text(recipe.difficulty)),
                    if (recipe.needsGrownUpHelp) const Chip(label: Text('Needs a grown-up'), backgroundColor: AppColors.secondary),
                  ],
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("What you'll need", style: TextStyle(fontWeight: FontWeight.w900)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: recipe.ingredients.map((i) => Chip(label: Text(i.name))).toList(),
                      ),
                    ],
                  ),
                ),
                if (recipe.funFacts.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.1), borderRadius: BorderRadius.circular(24)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Fun fact', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 4),
                        Text(recipe.funFacts.first),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.push('/recipes/${widget.slug}/cook'),
                  child: const Text('Start Cooking'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _addingToGrocery ? null : () => _handleAddToGroceryList(recipe.id),
                  child: Text(_addingToGrocery ? 'Adding...' : 'Add ingredients to grocery list'),
                ),
                if (_addedMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(_addedMessage!, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.accent)),
                ],
                if (_addError != null) ...[
                  const SizedBox(height: 12),
                  Text(_addError!, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.danger)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
