/// Child-mode recipe detail -- matches recipeModeShaper.js's
/// shapeRecipeDetail(recipe, "child") exactly (verified against source).
/// No quantities/units on ingredients and no `steps` array at all --
/// steps are delivered one at a time via the cooking-session endpoints,
/// never all up front in child mode.
class ChildModeIngredient {
  const ChildModeIngredient({required this.name, required this.category});

  final String name;
  final String category;

  factory ChildModeIngredient.fromJson(Map<String, dynamic> json) {
    return ChildModeIngredient(name: json['name'] as String, category: json['category'] as String);
  }
}

class RecipeDetailChildMode {
  const RecipeDetailChildMode({
    required this.id,
    required this.title,
    required this.description,
    this.coverImage,
    required this.difficulty,
    required this.totalTimeMinutes,
    required this.stepCount,
    required this.cookingSkills,
    required this.funFacts,
    required this.xpReward,
    required this.ingredients,
    required this.needsGrownUpHelp,
    this.unlocked,
  });

  final String id;
  final String title;
  final String description;
  final String? coverImage;
  final String difficulty;
  final int totalTimeMinutes;
  final int stepCount;
  final List<String> cookingSkills;
  final List<String> funFacts;
  final int xpReward;
  final List<ChildModeIngredient> ingredients;
  final bool needsGrownUpHelp;
  final bool? unlocked;

  factory RecipeDetailChildMode.fromJson(Map<String, dynamic> json) {
    return RecipeDetailChildMode(
      id: json['_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      coverImage: json['coverImage'] as String?,
      difficulty: json['difficulty'] as String? ?? 'easy',
      totalTimeMinutes: (json['totalTimeMinutes'] as num?)?.toInt() ?? 0,
      stepCount: (json['stepCount'] as num?)?.toInt() ?? 0,
      cookingSkills: (json['cookingSkills'] as List<dynamic>? ?? const []).cast<String>(),
      funFacts: (json['funFacts'] as List<dynamic>? ?? const []).cast<String>(),
      xpReward: (json['xpReward'] as num?)?.toInt() ?? 0,
      ingredients: (json['ingredients'] as List<dynamic>? ?? const [])
          .map((e) => ChildModeIngredient.fromJson(e as Map<String, dynamic>))
          .toList(),
      needsGrownUpHelp: json['needsGrownUpHelp'] as bool? ?? false,
      unlocked: json['unlocked'] as bool?,
    );
  }
}
