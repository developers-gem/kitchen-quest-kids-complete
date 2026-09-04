import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/game_detail.dart';

void main() {
  group('GameDetail.fromJson', () {
    test('parses a full response matching the real backend shape', () {
      final detail = GameDetail.fromJson({
        '_id': 'game-1',
        'title': 'Big Apple Crunch',
        'slug': 'big-apple-crunch',
        'state': 'New York',
        'gameType': 'quiz',
        'ageGroups': ['7-9', '10-12'],
        'difficulty': 'easy',
        'description': 'A fun quiz about apples',
        'learningObjectives': ['Learn about fiber'],
        'nutritionTopics': ['fiber'],
        'foodTopics': ['apples'],
        'instructions': 'Answer each question',
        'xpReward': 20,
        'maxStars': 3,
        'unlocked': true,
        'bestStars': 2,
      });

      expect(detail.id, 'game-1');
      expect(detail.title, 'Big Apple Crunch');
      expect(detail.gameType, 'quiz');
      expect(detail.ageGroups, ['7-9', '10-12']);
      expect(detail.unlocked, true);
      expect(detail.bestStars, 2);
    });

    test('handles missing optional fields without throwing', () {
      final detail = GameDetail.fromJson({
        '_id': 'game-1',
        'title': 'Minimal Game',
        'slug': 'minimal-game',
        'gameType': 'quiz',
        'ageGroups': <String>[],
      });

      expect(detail.difficulty, 'easy');
      expect(detail.xpReward, 0);
      expect(detail.maxStars, 3);
      expect(detail.unlocked, isNull);
      expect(detail.bestStars, isNull);
      expect(detail.learningObjectives, isEmpty);
    });
  });
}
