/// A single quiz question as delivered to the client -- always the
/// REDACTED shape (no correctOptionId), matching
/// gameType.schemas.js's redactConfigForClient exactly. This model has
/// no way to know or guess the correct answer, by construction --
/// scoring only ever happens server-side.
class QuizOption {
  const QuizOption({required this.id, required this.text});

  final String id;
  final String text;

  factory QuizOption.fromJson(Map<String, dynamic> json) {
    return QuizOption(id: json['id'] as String, text: json['text'] as String);
  }
}

class QuizQuestion {
  const QuizQuestion({required this.id, required this.prompt, required this.options});

  final String id;
  final String prompt;
  final List<QuizOption> options;

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'] as String,
      prompt: json['prompt'] as String,
      options: (json['options'] as List<dynamic>).map((o) => QuizOption.fromJson(o as Map<String, dynamic>)).toList(),
    );
  }
}

class StartGameSessionResult {
  const StartGameSessionResult({
    required this.sessionId,
    required this.gameType,
    required this.quizQuestions,
  });

  final String sessionId;
  final String gameType;
  // Only populated when gameType == 'quiz' -- see game_play_screen.dart
  // for why every other gameType shows an honest "not playable yet"
  // message instead of attempting to render this as something else.
  final List<QuizQuestion>? quizQuestions;

  factory StartGameSessionResult.fromJson(Map<String, dynamic> json) {
    final game = json['game'] as Map<String, dynamic>;
    final gameType = game['gameType'] as String;
    final configuration = game['configuration'] as Map<String, dynamic>;

    List<QuizQuestion>? quizQuestions;
    if (gameType == 'quiz') {
      quizQuestions = (configuration['questions'] as List<dynamic>)
          .map((q) => QuizQuestion.fromJson(q as Map<String, dynamic>))
          .toList();
    }

    return StartGameSessionResult(
      sessionId: (json['session'] as Map<String, dynamic>)['_id'] as String,
      gameType: gameType,
      quizQuestions: quizQuestions,
    );
  }
}

/// A minimal projection of an earned Achievement -- just enough for a
/// completion-celebration screen. Verified against
/// achievementEngine.service.js's actual return shape (the same
/// verification done for the web client, not guessed independently a
/// second time).
class EarnedAchievement {
  const EarnedAchievement({required this.id, required this.title, this.icon});

  final String id;
  final String title;
  final String? icon;

  factory EarnedAchievement.fromJson(Map<String, dynamic> json) {
    return EarnedAchievement(id: json['_id'] as String, title: json['title'] as String, icon: json['icon'] as String?);
  }
}

class CompleteGameSessionResult {
  const CompleteGameSessionResult({
    required this.score,
    required this.scoreTotal,
    required this.stars,
    required this.xpEarned,
    required this.isFirstCompletion,
    required this.dailyCapReached,
    required this.currentStreak,
    required this.streakIncreased,
    required this.newlyEarnedAchievements,
  });

  final int score;
  final int scoreTotal;
  final int stars;
  final int xpEarned;
  final bool isFirstCompletion;
  final bool dailyCapReached;
  final int currentStreak;
  final bool streakIncreased;
  final List<EarnedAchievement> newlyEarnedAchievements;

  factory CompleteGameSessionResult.fromJson(Map<String, dynamic> json) {
    final session = json['session'] as Map<String, dynamic>;
    final child = json['child'] as Map<String, dynamic>;
    return CompleteGameSessionResult(
      score: (session['score'] as num).toInt(),
      scoreTotal: (session['scoreTotal'] as num).toInt(),
      stars: (session['stars'] as num).toInt(),
      xpEarned: (session['xpEarned'] as num).toInt(),
      isFirstCompletion: session['isFirstCompletion'] as bool,
      dailyCapReached: session['dailyCapReached'] as bool,
      currentStreak: (child['currentStreak'] as num).toInt(),
      streakIncreased: child['streakIncreased'] as bool,
      newlyEarnedAchievements: (json['newlyEarnedAchievements'] as List<dynamic>? ?? const [])
          .map((a) => EarnedAchievement.fromJson(a as Map<String, dynamic>))
          .toList(),
    );
  }
}
