import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/game_summary.dart';
import '../../../models/game_detail.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/game_repository.dart';

final gameRepositoryProvider = Provider<GameRepository>((ref) {
  return GameRepository(ref.watch(apiClientProvider));
});

/// The games list for the currently active child, keyed by (childId,
/// search) so switching children or searching both correctly trigger a
/// fresh fetch rather than showing stale data -- mirrors the web app's
/// React Query key shape for the same screen.
final gamesListProvider = FutureProvider.family<List<GameSummary>, ({String? childId, String search})>((ref, params) {
  return ref.watch(gameRepositoryProvider).listGames(childId: params.childId, search: params.search);
});

final gameDetailProvider = FutureProvider.family<GameDetail, ({String slug, String? childId})>((ref, params) {
  return ref.watch(gameRepositoryProvider).getGameBySlug(params.slug, childId: params.childId);
});
