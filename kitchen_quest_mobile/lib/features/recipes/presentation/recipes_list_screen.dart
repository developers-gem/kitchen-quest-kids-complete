import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/progress_card.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/recipes_controller.dart';

/// Mirrors the web app's RecipesListPage.tsx: browse via the
/// already-built RecipeCard, against a backend contract that was
/// already complete.
class RecipesListScreen extends ConsumerStatefulWidget {
  const RecipesListScreen({super.key});

  @override
  ConsumerState<RecipesListScreen> createState() => _RecipesListScreenState();
}

class _RecipesListScreenState extends ConsumerState<RecipesListScreen> {
  final _searchController = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeChild = ref.watch(activeChildProvider);
    final recipesAsync = ref.watch(recipesListProvider((childId: activeChild?.id, search: _search)));

    return Scaffold(
      appBar: AppBar(title: const Text('Recipes')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(hintText: 'Search recipes...', prefixIcon: Icon(Icons.search)),
              onChanged: (value) => setState(() => _search = value),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: recipesAsync.when(
                loading: () => const LoadingState(label: 'Loading recipes...'),
                error: (err, _) => ErrorState(
                  message: ErrorState.messageFor(err),
                  onRetry: () => ref.invalidate(recipesListProvider),
                ),
                data: (recipes) {
                  if (recipes.isEmpty) {
                    return const EmptyState(title: 'No recipes found', description: 'Try a different search, or check back soon!');
                  }
                  return GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.8,
                    ),
                    itemCount: recipes.length,
                    itemBuilder: (context, index) {
                      final recipe = recipes[index];
                      return RecipeCard(recipe: recipe, onTap: () => context.push('/recipes/${recipe.slug}'));
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
