import '../../../models/recipe_summary.dart';
import '../../../models/recipe_detail.dart';
import '../../../models/recipe_progress.dart';
import '../../../models/grocery_list.dart';
import '../../../services/api_client.dart';

/// Mirrors the web app's api/recipes.ts -- same endpoints, same shapes,
/// verified against recipe.service.js directly. Child mode only (no
/// parent-mode detail, no verify-cooking) -- this is the child-facing
/// cooking flow; a parent-facing recipe management/verification screen
/// would belong to the Parent Dashboard feature, not here.
class RecipeRepository {
  RecipeRepository(this._client);

  final ApiClient _client;

  Future<List<RecipeSummary>> listRecipes({String? childId, String? search}) async {
    final result = await _client.getPaginated<List<dynamic>>(
      '/recipes',
      query: {if (childId != null) 'childId': childId, if (search != null && search.isNotEmpty) 'search': search, 'limit': 50},
    );
    return result.data.map((e) => RecipeSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<RecipeDetailChildMode> getRecipeBySlug(String slug, {String? childId}) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/recipes/$slug',
      query: {'mode': 'child', if (childId != null) 'childId': childId},
    );
    return RecipeDetailChildMode.fromJson(data);
  }

  Future<StepProgressResult> startCooking(String recipeId, String childId) async {
    final data = await _client.post<Map<String, dynamic>>('/recipes/$recipeId/start', body: {'childId': childId});
    return StepProgressResult.fromJson(data);
  }

  Future<StepProgressResult> advanceStep(String progressId, String childId) async {
    final data = await _client.post<Map<String, dynamic>>('/recipes/progress/$progressId/advance', body: {'childId': childId});
    return StepProgressResult.fromJson(data);
  }

  Future<CompleteCookingResult> completeCooking(String progressId, String childId) async {
    final data = await _client.post<Map<String, dynamic>>('/recipes/progress/$progressId/complete', body: {'childId': childId});
    return CompleteCookingResult.fromJson(data);
  }

  /// FIXED (gap investigation): this method didn't exist at all on
  /// mobile, mirroring the exact same gap found and fixed on web -- the
  /// backend endpoint (POST /recipes/:id/add-to-grocery-list) has always
  /// worked, nothing on either client called it. Family-scoped, not
  /// child-scoped (no childId needed), matching grocery.service.js's
  /// contract exactly.
  Future<GroceryList> addToGroceryList(String recipeId) async {
    final data = await _client.post<Map<String, dynamic>>('/recipes/$recipeId/add-to-grocery-list');
    return GroceryList.fromJson(data);
  }
}
