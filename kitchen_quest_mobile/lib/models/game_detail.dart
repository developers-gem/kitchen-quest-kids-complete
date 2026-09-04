/// Full game detail -- matches the backend's GET /games/:slug response
/// (game.service.js's getBySlug), verified against source rather than
/// guessed. Distinct from GameSummary (list-view, display-only): this
/// carries what's needed before starting a session (instructions,
/// learning objectives) but never the configuration itself -- that's
/// only ever delivered by /games/:id/start, redacted, at the moment a
/// session actually begins.
class GameDetail {
  const GameDetail({
    required this.id,
    required this.title,
    required this.slug,
    this.state,
    required this.gameType,
    required this.ageGroups,
    required this.difficulty,
    this.description,
    required this.learningObjectives,
    required this.nutritionTopics,
    required this.foodTopics,
    this.instructions,
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
  final List<String> ageGroups;
  final String difficulty;
  final String? description;
  final List<String> learningObjectives;
  final List<String> nutritionTopics;
  final List<String> foodTopics;
  final String? instructions;
  final int xpReward;
  final int maxStars;
  final bool? unlocked;
  final int? bestStars;

  factory GameDetail.fromJson(Map<String, dynamic> json) {
    return GameDetail(
      id: json['_id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      state: json['state'] as String?,
      gameType: json['gameType'] as String,
      ageGroups: (json['ageGroups'] as List<dynamic>? ?? const []).cast<String>(),
      difficulty: json['difficulty'] as String? ?? 'easy',
      description: json['description'] as String?,
      learningObjectives: (json['learningObjectives'] as List<dynamic>? ?? const []).cast<String>(),
      nutritionTopics: (json['nutritionTopics'] as List<dynamic>? ?? const []).cast<String>(),
      foodTopics: (json['foodTopics'] as List<dynamic>? ?? const []).cast<String>(),
      instructions: json['instructions'] as String?,
      xpReward: (json['xpReward'] as num?)?.toInt() ?? 0,
      maxStars: (json['maxStars'] as num?)?.toInt() ?? 3,
      unlocked: json['unlocked'] as bool?,
      bestStars: (json['bestStars'] as num?)?.toInt(),
    );
  }
}
