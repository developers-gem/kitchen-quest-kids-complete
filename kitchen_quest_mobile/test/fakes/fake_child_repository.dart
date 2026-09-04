import 'package:kitchen_quest_mobile/features/child_profiles/data/child_repository.dart';
import 'package:kitchen_quest_mobile/models/avatar.dart';
import 'package:kitchen_quest_mobile/models/child_profile.dart';

class FakeChildRepository implements ChildRepository {
  List<ChildProfile> children = const [];

  @override
  Future<List<ChildProfile>> listChildren() async => children;

  @override
  Future<ChildProfile> createChild({
    required String displayName,
    required String ageRange,
    String? avatarConfigId,
    String? avatarColor,
  }) {
    throw UnimplementedError('Not needed by the tests using this fake yet');
  }

  @override
  Future<ChildProfile> updateChild(
    String childId, {
    String? displayName,
    String? ageRange,
    String? avatarConfigId,
    String? avatarColor,
  }) {
    throw UnimplementedError('Not needed by the tests using this fake yet');
  }

  @override
  Future<void> deleteChild(String childId) async {}

  @override
  Future<AvatarCatalog> getAvatarCatalog() {
    throw UnimplementedError('Not needed by the tests using this fake yet');
  }
}
