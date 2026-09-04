/// List-view region -- matches region.service.js's listRegions response
/// exactly (verified against source, not guessed): note `gameCount`, not
/// `active` -- the backend migrated Region to the same draft/review/
/// published/archived workflow every other content type uses a while
/// back, and this model was written fresh against that current shape
/// rather than an older assumption (the web client's own Region type
/// carried a stale `active: boolean` field for a while for exactly this
/// reason -- see kitchen-quest-web's Region type fix).
class RegionSummary {
  const RegionSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.scopeType,
    this.state,
    required this.unlockOrder,
    required this.gameCount,
    this.unlocked,
  });

  final String id;
  final String name;
  final String slug;
  final String scopeType; // "usState" | "usRegion" | "country"
  final String? state;
  final int unlockOrder;
  final int gameCount;
  final bool? unlocked;

  factory RegionSummary.fromJson(Map<String, dynamic> json) {
    return RegionSummary(
      id: json['_id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      scopeType: json['scopeType'] as String,
      state: json['state'] as String?,
      unlockOrder: (json['unlockOrder'] as num?)?.toInt() ?? 0,
      gameCount: (json['gameCount'] as num?)?.toInt() ?? 0,
      unlocked: json['unlocked'] as bool?,
    );
  }
}

class RegionGameSummary {
  const RegionGameSummary({required this.id, required this.title, required this.slug, required this.gameType});

  final String id;
  final String title;
  final String slug;
  final String gameType;

  factory RegionGameSummary.fromJson(Map<String, dynamic> json) {
    return RegionGameSummary(
      id: json['_id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      gameType: json['gameType'] as String,
    );
  }
}

/// Detail view -- matches region.service.js's getRegionBySlug response.
class RegionDetail {
  const RegionDetail({
    required this.id,
    required this.name,
    required this.slug,
    required this.scopeType,
    this.state,
    required this.unlockOrder,
    required this.games,
    this.unlocked,
  });

  final String id;
  final String name;
  final String slug;
  final String scopeType;
  final String? state;
  final int unlockOrder;
  final List<RegionGameSummary> games;
  final bool? unlocked;

  factory RegionDetail.fromJson(Map<String, dynamic> json) {
    return RegionDetail(
      id: json['_id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      scopeType: json['scopeType'] as String,
      state: json['state'] as String?,
      unlockOrder: (json['unlockOrder'] as num?)?.toInt() ?? 0,
      games: (json['games'] as List<dynamic>? ?? const [])
          .map((e) => RegionGameSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      unlocked: json['unlocked'] as bool?,
    );
  }
}
