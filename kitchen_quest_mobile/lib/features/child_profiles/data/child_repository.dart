import '../../../models/child_profile.dart';
import '../../../models/avatar.dart';
import '../../../services/api_client.dart';

/// Mirrors the web app's api/children.ts + api/avatars.ts. Every mutating
/// call here (create/update/delete) requires a parental-gate token to
/// already be attached by ApiClient's AuthInterceptor -- callers must run
/// `ensureParentalGate` first (see shared/widgets/parental_gate_dialog.dart);
/// this repository doesn't check for that itself, the backend enforces it.
class ChildRepository {
  ChildRepository(this._client);

  final ApiClient _client;

  Future<List<ChildProfile>> listChildren() async {
    final data = await _client.get<List<dynamic>>('/children');
    return data.map((e) => ChildProfile.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChildProfile> createChild({
    required String displayName,
    required String ageRange,
    String? avatarConfigId,
    String? avatarColor,
  }) async {
    final data = await _client.post<Map<String, dynamic>>('/children', body: {
      'displayName': displayName,
      'ageRange': ageRange,
      if (avatarConfigId != null) 'avatarConfigId': avatarConfigId,
      if (avatarColor != null) 'avatarColor': avatarColor,
    });
    return ChildProfile.fromJson(data);
  }

  Future<ChildProfile> updateChild(
    String childId, {
    String? displayName,
    String? ageRange,
    String? avatarConfigId,
    String? avatarColor,
  }) async {
    final body = <String, dynamic>{};
    if (displayName != null) body['displayName'] = displayName;
    if (ageRange != null) body['ageRange'] = ageRange;
    if (avatarConfigId != null) body['avatarConfigId'] = avatarConfigId;
    if (avatarColor != null) body['avatarColor'] = avatarColor;

    final data = await _client.patch<Map<String, dynamic>>('/children/$childId', body: body);
    return ChildProfile.fromJson(data);
  }

  Future<void> deleteChild(String childId) {
    return _client.delete<dynamic>('/children/$childId');
  }

  Future<AvatarCatalog> getAvatarCatalog({String? childId}) async {
    final data = await _client.get<Map<String, dynamic>>('/avatars', query: {if (childId != null) 'childId': childId});
    return AvatarCatalog.fromJson(data);
  }
}
