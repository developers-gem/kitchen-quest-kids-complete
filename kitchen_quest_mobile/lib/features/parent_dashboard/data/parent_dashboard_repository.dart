import '../../../models/parent_dashboard.dart';
import '../../../services/api_client.dart';

/// Mirrors the web app's api/parentDashboard.ts -- same 6 endpoints,
/// same shapes, verified against dashboard.service.js directly. Every
/// call here relies on ApiClient's AuthInterceptor already attaching a
/// valid x-parental-gate-token -- callers must run ensureParentalGate()
/// first (see shared/widgets/parental_gate_dialog.dart); this repository
/// doesn't check for that itself, the backend enforces it (requireParentalGate()
/// wraps the entire dashboard.routes.js router, not per-endpoint).
class ParentDashboardRepository {
  ParentDashboardRepository(this._client);

  final ApiClient _client;

  Future<DashboardOverview> getOverview(String childId) async {
    final data = await _client.get<Map<String, dynamic>>('/parent-dashboard/overview', query: {'childId': childId});
    return DashboardOverview.fromJson(data);
  }

  Future<WeeklySummary> getWeeklySummary(String childId) async {
    final data = await _client.get<Map<String, dynamic>>('/parent-dashboard/weekly-summary', query: {'childId': childId});
    return WeeklySummary.fromJson(data);
  }

  Future<LearningProgress> getLearningProgress(String childId) async {
    final data = await _client.get<Map<String, dynamic>>('/parent-dashboard/learning-progress', query: {'childId': childId});
    return LearningProgress.fromJson(data);
  }

  Future<ActivityHistoryPage> getActivityHistory(String childId, {int page = 1}) async {
    final result = await _client.getPaginated<Map<String, dynamic>>(
      '/parent-dashboard/activity-history',
      query: {'childId': childId, 'page': page},
    );
    return ActivityHistoryPage.fromJson(result.data, {'page': result.page, 'totalPages': result.totalPages});
  }

  Future<GroceryOverviewCounts> getGroceryOverview() async {
    final data = await _client.get<Map<String, dynamic>>('/parent-dashboard/grocery');
    return GroceryOverviewCounts.fromJson(data);
  }

  Future<ParentSettings> getSettings() async {
    final data = await _client.get<Map<String, dynamic>>('/parent-dashboard/settings');
    return ParentSettings.fromJson(data);
  }
}
