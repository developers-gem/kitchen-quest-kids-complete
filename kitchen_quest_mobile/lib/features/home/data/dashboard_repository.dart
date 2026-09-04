import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/game_summary.dart';
import '../../../models/recipe_summary.dart';
import '../../../services/api_client.dart';
import '../../../shared/providers/core_providers.dart';

const _featuredLimit = 4;

/// Deliberately minimal: just enough to populate the Home Dashboard's
/// "Featured games"/"Featured recipes" sections (real API calls, not
/// mock data -- GET /games and GET /recipes already exist and work).
/// The FULL games/recipes features (library screens, launch, cooking
/// mode) are Phase 3/4 and get their own richer repository + models when
/// built -- this class is not meant to grow into that.
class DashboardRepository {
  DashboardRepository(this._client);

  final ApiClient _client;

  Future<List<GameSummary>> getFeaturedGames(String childId) async {
    final result = await _client.getPaginated<List<dynamic>>('/games', query: {'childId': childId, 'limit': _featuredLimit});
    return result.data.map((e) => GameSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RecipeSummary>> getFeaturedRecipes(String childId) async {
    final result = await _client.getPaginated<List<dynamic>>('/recipes', query: {'childId': childId, 'limit': _featuredLimit});
    return result.data.map((e) => RecipeSummary.fromJson(e as Map<String, dynamic>)).toList();
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(apiClientProvider));
});
