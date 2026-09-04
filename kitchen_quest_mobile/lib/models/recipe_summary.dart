/// Minimal subset of the backend's Recipe list-response shape -- see
/// game_summary.dart's doc comment for why this stays display-only.
class RecipeSummary {
  const RecipeSummary({
    required this.id,
    required this.title,
    required this.slug,
    this.shortDescription,
    required this.difficulty,
    required this.totalTimeMinutes,
    required this.stepCount,
    required this.allergenInformation,
    required this.xpReward,
    this.unlocked,
  });

  final String id;
  final String title;
  final String slug;
  final String? shortDescription;
  final String difficulty;
  final int totalTimeMinutes;
  final int stepCount;
  final List<String> allergenInformation;
  final int xpReward;
  final bool? unlocked;

  factory RecipeSummary.fromJson(Map<String, dynamic> json) {
    return RecipeSummary(
      id: json['_id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      shortDescription: json['shortDescription'] as String?,
      difficulty: json['difficulty'] as String? ?? 'easy',
      totalTimeMinutes: (json['totalTimeMinutes'] as num?)?.toInt() ?? 0,
      stepCount: (json['stepCount'] as num?)?.toInt() ?? 0,
      allergenInformation: (json['allergenInformation'] as List<dynamic>? ?? const []).cast<String>(),
      xpReward: (json['xpReward'] as num?)?.toInt() ?? 0,
      unlocked: json['unlocked'] as bool?,
    );
  }
}
