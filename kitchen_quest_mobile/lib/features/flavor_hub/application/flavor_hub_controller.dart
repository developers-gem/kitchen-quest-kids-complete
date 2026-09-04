import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/region.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/region_repository.dart';

final regionRepositoryProvider = Provider<RegionRepository>((ref) {
  return RegionRepository(ref.watch(apiClientProvider));
});

final regionsListProvider = FutureProvider.family<List<RegionSummary>, String?>((ref, childId) {
  return ref.watch(regionRepositoryProvider).listRegions(childId: childId);
});

final regionDetailProvider = FutureProvider.family<RegionDetail, ({String slug, String? childId})>((ref, params) {
  return ref.watch(regionRepositoryProvider).getRegionBySlug(params.slug, childId: params.childId);
});
