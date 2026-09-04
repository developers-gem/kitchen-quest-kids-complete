import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/recipe_detail.dart';

void main() {
  group('RecipeDetailChildMode.fromJson', () {
    test('parses child-mode ingredients without quantities/units (matches shapeRecipeDetail child mode)', () {
      final detail = RecipeDetailChildMode.fromJson({
        '_id': 'recipe-1',
        'title': 'Garden Skewers',
        'description': 'A no-cook recipe',
        'difficulty': 'easy',
        'totalTimeMinutes': 10,
        'stepCount': 2,
        'cookingSkills': ['knife-free prep'],
        'funFacts': ['Tomatoes are technically a fruit!'],
        'xpReward': 30,
        'ingredients': [
          {'name': 'Tomato', 'category': 'Produce'},
          {'name': 'Cheese cube', 'category': 'Dairy'},
        ],
        'needsGrownUpHelp': false,
        'unlocked': true,
      });

      expect(detail.title, 'Garden Skewers');
      expect(detail.ingredients, hasLength(2));
      expect(detail.ingredients.first.name, 'Tomato');
      expect(detail.needsGrownUpHelp, false);
      expect(detail.unlocked, true);
    });

    test('handles missing optional fields without throwing', () {
      final detail = RecipeDetailChildMode.fromJson({
        '_id': 'recipe-1',
        'title': 'Minimal Recipe',
        'description': 'A recipe',
      });

      expect(detail.difficulty, 'easy');
      expect(detail.totalTimeMinutes, 0);
      expect(detail.ingredients, isEmpty);
      expect(detail.needsGrownUpHelp, false);
      expect(detail.unlocked, isNull);
    });
  });
}
