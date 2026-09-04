import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/games_controller.dart';
import '../data/game_repository.dart';
import '../../../models/game_session.dart';
import 'quiz_player_widget.dart';

/// FLAGSHIP + HONEST GAP, mirroring the web app's GamePlayPage.tsx
/// exactly: "quiz" is the one gameType with a real, complete interactive
/// player. The other 8 (matching, sorting, memory, sequence,
/// dragAndDrop, maze, ingredientBuilder, timedChallenge) each need their
/// own bespoke interaction pattern -- real, substantial UI work per
/// type, not something to fake with a shared generic widget. Unsupported
/// types show an honest "not playable here yet" message and CRITICALLY
/// never call startGameSession, so a child tapping into a game they
/// can't actually play doesn't get a phantom gamesPlayed stat increment
/// (the same guarantee the web client makes, for the same reason).
const _supportedGameTypes = {'quiz'};

class GamePlayScreen extends ConsumerStatefulWidget {
  const GamePlayScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<GamePlayScreen> createState() => _GamePlayScreenState();
}

enum _Stage { intro, playing, results }

class _GamePlayScreenState extends ConsumerState<GamePlayScreen> {
  _Stage _stage = _Stage.intro;
  String? _sessionId;
  List<QuizQuestion>? _questions;
  CompleteGameSessionResult? _results;
  String? _startError;
  bool _starting = false;

  Future<void> _handleStart(String gameId, String childId) async {
    setState(() {
      _starting = true;
      _startError = null;
    });
    try {
      final result = await ref.read(gameRepositoryProvider).startGameSession(gameId, childId);
      setState(() {
        _sessionId = result.sessionId;
        _questions = result.quizQuestions;
        _stage = _Stage.playing;
      });
    } catch (err) {
      setState(() => _startError = ErrorState.messageFor(err));
    } finally {
      setState(() => _starting = false);
    }
  }

  Future<void> _handleFinish(String gameId, String childId, List<Map<String, String>> answers) async {
    final result = await ref.read(gameRepositoryProvider).completeGameSession(
          gameId: gameId,
          sessionId: _sessionId!,
          childId: childId,
          outcome: {'answers': answers},
        );
    setState(() {
      _results = result;
      _stage = _Stage.results;
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeChild = ref.watch(activeChildProvider);
    if (activeChild == null) return const Scaffold(body: LoadingState());

    final detailAsync = ref.watch(gameDetailProvider((slug: widget.slug, childId: activeChild.id)));

    return Scaffold(
      appBar: AppBar(title: const Text('Play')),
      body: detailAsync.when(
        loading: () => const LoadingState(label: 'Loading game...'),
        error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
        data: (game) {
          if (game.unlocked == false) {
            return EmptyState(
              icon: '🔒',
              title: '${game.title} is locked',
              description: 'Keep playing and leveling up to unlock this game!',
              action: OutlinedButton(onPressed: () => context.pop(), child: const Text('Back to Games')),
            );
          }

          if (!_supportedGameTypes.contains(game.gameType)) {
            return EmptyState(
              icon: '🚧',
              title: "${game.title} isn't playable here yet",
              description:
                  '"${game.gameType}" games need their own interactive experience, coming in a future update. Quiz games are ready to play now!',
              action: OutlinedButton(onPressed: () => context.pop(), child: const Text('Back to Games')),
            );
          }

          switch (_stage) {
            case _Stage.intro:
              return _IntroView(
                title: game.title,
                starting: _starting,
                error: _startError,
                onStart: () => _handleStart(game.id, activeChild.id),
              );
            case _Stage.playing:
              return QuizPlayerWidget(
                questions: _questions!,
                onFinish: (answers) => _handleFinish(game.id, activeChild.id, answers),
              );
            case _Stage.results:
              return _ResultsView(results: _results!, onExit: () => context.pop(), onPlayAgain: () => setState(() => _stage = _Stage.intro));
          }
        },
      ),
    );
  }
}

class _IntroView extends StatelessWidget {
  const _IntroView({required this.title, required this.starting, required this.error, required this.onStart});

  final String title;
  final bool starting;
  final String? error;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎮', style: TextStyle(fontSize: 56)),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Answer every question to earn stars and XP!',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.foreground.withOpacity(0.6)),
            ),
            if (error != null) ...[
              const SizedBox(height: 12),
              Text(error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: starting ? null : onStart,
                child: Text(starting ? 'Getting ready...' : 'Start'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultsView extends StatelessWidget {
  const _ResultsView({required this.results, required this.onExit, required this.onPlayAgain});

  final CompleteGameSessionResult results;
  final VoidCallback onExit;
  final VoidCallback onPlayAgain;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(results.stars >= 3 ? '🌟' : (results.stars > 0 ? '⭐' : '🎉'), style: const TextStyle(fontSize: 64)),
            const SizedBox(height: 12),
            Text(
              results.isFirstCompletion ? 'Great job!' : 'Nice replay!',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            Text('${results.score} out of ${results.scoreTotal} correct'),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(3, (i) => Icon(i < results.stars ? Icons.star : Icons.star_border, color: Colors.amber, size: 32)),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24)),
              child: Column(
                children: [
                  Text('+${results.xpEarned} XP', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.accent)),
                  if (results.dailyCapReached)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        "You've hit today's XP limit for replays -- come back tomorrow!",
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.foreground.withOpacity(0.5)),
                      ),
                    ),
                  if (results.streakIncreased)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('🔥 ${results.currentStreak}-day streak!', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                ],
              ),
            ),
            if (results.newlyEarnedAchievements.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.2), borderRadius: BorderRadius.circular(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      results.newlyEarnedAchievements.length > 1 ? 'New achievements!' : 'New achievement!',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    ...results.newlyEarnedAchievements.map((a) => Text('• ${a.title}')),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: onPlayAgain, child: const Text('Play again'))),
                const SizedBox(width: 12),
                Expanded(child: ElevatedButton(onPressed: onExit, child: const Text('Back to Games'))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
