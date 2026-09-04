import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/parent_dashboard.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/parent_dashboard_repository.dart';

final parentDashboardRepositoryProvider = Provider<ParentDashboardRepository>((ref) {
  return ParentDashboardRepository(ref.watch(apiClientProvider));
});

final dashboardOverviewProvider = FutureProvider.family<DashboardOverview, String>((ref, childId) {
  return ref.watch(parentDashboardRepositoryProvider).getOverview(childId);
});

final weeklySummaryProvider = FutureProvider.family<WeeklySummary, String>((ref, childId) {
  return ref.watch(parentDashboardRepositoryProvider).getWeeklySummary(childId);
});

final learningProgressProvider = FutureProvider.family<LearningProgress, String>((ref, childId) {
  return ref.watch(parentDashboardRepositoryProvider).getLearningProgress(childId);
});

final activityHistoryProvider = FutureProvider.family<ActivityHistoryPage, ({String childId, int page})>((ref, params) {
  return ref.watch(parentDashboardRepositoryProvider).getActivityHistory(params.childId, page: params.page);
});

final groceryOverviewProvider = FutureProvider<GroceryOverviewCounts>((ref) {
  return ref.watch(parentDashboardRepositoryProvider).getGroceryOverview();
});

final parentSettingsProvider = FutureProvider<ParentSettings>((ref) {
  return ref.watch(parentDashboardRepositoryProvider).getSettings();
});
