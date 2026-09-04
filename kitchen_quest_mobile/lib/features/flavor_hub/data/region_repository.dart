import '../../../models/region.dart';
import '../../../services/api_client.dart';

/// Mirrors the web app's api/regions.ts -- same two endpoints, same
/// shapes, verified against region.service.js directly.
class RegionRepository {
  RegionRepository(this._client);

  final ApiClient _client;

  Future<List<RegionSummary>> listRegions({String? childId}) async {
    final data = await _client.get<List<dynamic>>('/regions', query: {if (childId != null) 'childId': childId});
    return data.map((e) => RegionSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<RegionDetail> getRegionBySlug(String slug, {String? childId}) async {
    final data = await _client.get<Map<String, dynamic>>('/regions/$slug', query: {if (childId != null) 'childId': childId});
    return RegionDetail.fromJson(data);
  }
}
