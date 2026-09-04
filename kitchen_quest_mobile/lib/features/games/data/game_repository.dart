import '../../../models/game_summary.dart';
import '../../../models/game_detail.dart';
import '../../../models/game_session.dart';
import '../../../services/api_client.dart';

/// Mirrors the web app's api/games.ts one-to-one -- same endpoints, same
/// shapes, verified against the same backend source rather than
/// re-derived independently for this client.
class GameRepository {
  GameRepository(this._client);

  final ApiClient _client;

  Future<List<GameSummary>> listGames({String? childId, String? search}) async {
    final result = await _client.getPaginated<List<dynamic>>(
      '/games',
      query: {if (childId != null) 'childId': childId, if (search != null && search.isNotEmpty) 'search': search, 'limit': 50},
    );
    return result.data.map((e) => GameSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<GameDetail> getGameBySlug(String slug, {String? childId}) async {
    final data = await _client.get<Map<String, dynamic>>('/games/$slug', query: {if (childId != null) 'childId': childId});
    return GameDetail.fromJson(data);
  }

  Future<StartGameSessionResult> startGameSession(String gameId, String childId) async {
    final data = await _client.post<Map<String, dynamic>>('/games/$gameId/start', body: {'childId': childId});
    return StartGameSessionResult.fromJson(data);
  }

  Future<CompleteGameSessionResult> completeGameSession({
    required String gameId,
    required String sessionId,
    required String childId,
    required Map<String, dynamic> outcome,
  }) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/games/$gameId/complete',
      body: {'sessionId': sessionId, 'childId': childId, 'outcome': outcome},
    );
    return CompleteGameSessionResult.fromJson(data);
  }
}
