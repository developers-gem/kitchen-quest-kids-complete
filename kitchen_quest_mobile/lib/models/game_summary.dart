/// Minimal subset of the backend's Game list-response shape -- enough to
/// render a card. Full gameplay-relevant fields (configuration, etc.)
/// belong to the Phase 3 games feature's own model, not here; this model
/// intentionally stays display-only since that's all the Home Dashboard
/// (Phase 2) needs.
class GameSummary {
  const GameSummary({
    required this.id,
    required this.title,
    required this.slug,
    this.state,
    required this.gameType,
    required this.difficulty,
    required this.xpReward,
    required this.maxStars,
    this.unlocked,
    this.bestStars,
  });

  final String id;
  final String title;
  final String slug;
  final String? state;
  final String gameType;
  final String difficulty;
  final int xpReward;
  final int maxStars;
  final bool? unlocked;
  final int? bestStars;

  factory GameSummary.fromJson(Map<String, dynamic> json) {
    return GameSummary(
      id: json['_id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      state: json['state'] as String?,
      gameType: json['gameType'] as String,
      difficulty: json['difficulty'] as String? ?? 'easy',
      xpReward: (json['xpReward'] as num?)?.toInt() ?? 0,
      maxStars: (json['maxStars'] as num?)?.toInt() ?? 3,
      unlocked: json['unlocked'] as bool?,
      bestStars: (json['bestStars'] as num?)?.toInt(),
    );
  }
}
