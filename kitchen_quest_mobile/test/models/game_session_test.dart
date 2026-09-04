import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/game_session.dart';

void main() {
  group('StartGameSessionResult.fromJson', () {
    test('parses quiz questions from the redacted configuration shape', () {
      final result = StartGameSessionResult.fromJson({
        'session': {'_id': 'session-1', 'status': 'inProgress', 'startedAt': '2026-01-01T00:00:00.000Z'},
        'game': {
          '_id': 'game-1',
          'title': 'Big Apple Crunch',
          'gameType': 'quiz',
          'maxStars': 3,
          'configuration': {
            'questions': [
              {
                'id': 'q1',
                'prompt': 'Which is a fruit?',
                'options': [
                  {'id': 'a', 'text': 'Apple'},
                  {'id': 'b', 'text': 'Carrot'},
                ],
              },
            ],
          },
        },
      });

      expect(result.sessionId, 'session-1');
      expect(result.gameType, 'quiz');
      expect(result.quizQuestions, isNotNull);
      expect(result.quizQuestions!.length, 1);
      expect(result.quizQuestions!.first.prompt, 'Which is a fruit?');
      expect(result.quizQuestions!.first.options.map((o) => o.text), ['Apple', 'Carrot']);
    });

    test('leaves quizQuestions null for a non-quiz gameType (never guesses a shape it does not know)', () {
      final result = StartGameSessionResult.fromJson({
        'session': {'_id': 'session-2', 'status': 'inProgress', 'startedAt': '2026-01-01T00:00:00.000Z'},
        'game': {
          '_id': 'game-2',
          'title': 'Some Matching Game',
          'gameType': 'matching',
          'maxStars': 3,
          'configuration': {'items': []},
        },
      });

      expect(result.gameType, 'matching');
      expect(result.quizQuestions, isNull);
    });
  });

  group('CompleteGameSessionResult.fromJson', () {
    test('parses a full completion response including nested child and achievement fields', () {
      final result = CompleteGameSessionResult.fromJson({
        'session': {
          '_id': 'session-1',
          'status': 'completed',
          'score': 3,
          'scoreTotal': 3,
          'stars': 3,
          'xpEarned': 20,
          'completionRank': 1,
          'isFirstCompletion': true,
          'dailyCapReached': false,
        },
        'child': {'totalXP': 120, 'currentLevel': 2, 'currentStreak': 4, 'streakIncreased': true},
        'newlyEarnedAchievements': [
          {'_id': 'ach-1', 'title': 'First Game!', 'icon': 'star'},
        ],
        'dailyChallenge': {'matched': false, 'justCompleted': false, 'xpAwarded': 0},
      });

      expect(result.score, 3);
      expect(result.stars, 3);
      expect(result.xpEarned, 20);
      expect(result.isFirstCompletion, true);
      expect(result.currentStreak, 4);
      expect(result.streakIncreased, true);
      expect(result.newlyEarnedAchievements, hasLength(1));
      expect(result.newlyEarnedAchievements.first.title, 'First Game!');
    });

    test('defaults newlyEarnedAchievements to an empty list when absent', () {
      final result = CompleteGameSessionResult.fromJson({
        'session': {
          '_id': 'session-1',
          'status': 'completed',
          'score': 1,
          'scoreTotal': 3,
          'stars': 1,
          'xpEarned': 5,
          'completionRank': 2,
          'isFirstCompletion': false,
          'dailyCapReached': false,
        },
        'child': {'totalXP': 5, 'currentLevel': 1, 'currentStreak': 1, 'streakIncreased': false},
      });

      expect(result.newlyEarnedAchievements, isEmpty);
    });
  });
}
