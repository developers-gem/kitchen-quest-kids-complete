import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/recipe_summary.dart';
import '../../../models/recipe_detail.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/recipe_repository.dart';

final recipeRepositoryProvider = Provider<RecipeRepository>((ref) {
  return RecipeRepository(ref.watch(apiClientProvider));
});

final recipesListProvider = FutureProvider.family<List<RecipeSummary>, ({String? childId, String search})>((ref, params) {
  return ref.watch(recipeRepositoryProvider).listRecipes(childId: params.childId, search: params.search);
});

final recipeDetailProvider = FutureProvider.family<RecipeDetailChildMode, ({String slug, String? childId})>((ref, params) {
  return ref.watch(recipeRepositoryProvider).getRecipeBySlug(params.slug, childId: params.childId);
});
