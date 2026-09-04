import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../../../models/recipe_progress.dart';
import '../application/recipes_controller.dart';
import '../data/recipe_repository.dart';

/// The interactive cooking flow: start (or transparently resume a
/// paused/in-progress session -- recipe.service.js's startCooking
/// already handles that server-side) -> walk through one step at a time
/// -> complete -> either a celebration screen or an honest "waiting for
/// a grown-up" state when the recipe requires parent verification.
///
/// CRITICAL: `currentStep` can legitimately be null while
/// `readyToComplete` is true -- this is the exact shape of the real
/// backend bug found and fixed while building the web client (see
/// recipe_progress.dart's doc comment). This screen must never assume
/// `currentStep` is non-null just because loading finished.
class CookingModeScreen extends ConsumerStatefulWidget {
  const CookingModeScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<CookingModeScreen> createState() => _CookingModeScreenState();
}

enum _Stage { starting, cooking, completed, pendingVerification }

class _CookingModeScreenState extends ConsumerState<CookingModeScreen> {
  _Stage _stage = _Stage.starting;
  String? _progressId;
  CurrentStepView? _currentStep;
  bool _readyToComplete = false;
  String? _startError;
  int _xpEarned = 0;
  bool _startedOnce = false;

  Future<void> _start(String recipeId, String childId) async {
    try {
      final result = await ref.read(recipeRepositoryProvider).startCooking(recipeId, childId);
      setState(() {
        _progressId = result.progressId;
        _currentStep = result.currentStep;
        _readyToComplete = result.readyToComplete;
        _stage = _Stage.cooking;
      });
    } catch (err) {
      setState(() => _startError = ErrorState.messageFor(err));
    }
  }

  Future<void> _advance(String childId) async {
    final result = await ref.read(recipeRepositoryProvider).advanceStep(_progressId!, childId);
    setState(() {
      _currentStep = result.currentStep;
      _readyToComplete = result.readyToComplete;
    });
  }

  Future<void> _complete(String childId) async {
    final result = await ref.read(recipeRepositoryProvider).completeCooking(_progressId!, childId);
    setState(() {
      _xpEarned = result.xpEarned;
      _stage = result.pendingParentVerification ? _Stage.pendingVerification : _Stage.completed;
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeChild = ref.watch(activeChildProvider);
    if (activeChild == null) return const Scaffold(body: LoadingState());

    final detailAsync = ref.watch(recipeDetailProvider((slug: widget.slug, childId: activeChild.id)));

    return Scaffold(
      appBar: AppBar(title: const Text('Cooking')),
      body: detailAsync.when(
        loading: () => const LoadingState(label: 'Loading recipe...'),
        error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
        data: (recipe) {
          if (!_startedOnce) {
            _startedOnce = true;
            WidgetsBinding.instance.addPostFrameCallback((_) => _start(recipe.id, activeChild.id));
          }

          if (_startError != null) return ErrorState(message: _startError);
          if (_stage == _Stage.starting) return const LoadingState(label: 'Getting your kitchen ready...');

          if (_stage == _Stage.pendingVerification) {
            return _MessageScreen(
              emoji: '👩‍🍳',
              title: 'Great cooking!',
              description: 'Ask a grown-up to confirm what you made in the Parent Dashboard to earn your XP.',
              onExit: () => context.pop(),
            );
          }

          if (_stage == _Stage.completed) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('🎉', style: TextStyle(fontSize: 64)),
                    const SizedBox(height: 12),
                    const Text('You did it!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24)),
                      child: Text('+$_xpEarned XP', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.accent)),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(onPressed: () => context.pop(), child: const Text('Back to Recipes')),
                  ],
                ),
              ),
            );
          }

          // _stage == _Stage.cooking
          if (_currentStep == null) {
            // Legitimately reached when resuming a session that had
            // already advanced through every step but was never
            // completed -- see this file's doc comment.
            return _MessageScreen(
              emoji: '👏',
              title: 'All steps done!',
              description: 'Ready to finish up?',
              buttonLabel: 'Finish Cooking',
              onExit: () => _complete(activeChild.id),
            );
          }

          final step = _currentStep!;
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                LinearProgressIndicator(value: step.stepNumber / step.totalSteps),
                const SizedBox(height: 8),
                Text(
                  'Step ${step.stepNumber} of ${step.totalSteps}',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.foreground.withOpacity(0.4)),
                ),
                const SizedBox(height: 16),
                Text(step.title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(step.instruction, textAlign: TextAlign.center),
                if (step.needsGrownUp) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
                    child: const Text('🧑‍🍳 Ask a grown-up to help with this step!', textAlign: TextAlign.center),
                  ),
                ],
                const Spacer(),
                ElevatedButton(
                  onPressed: _readyToComplete ? () => _complete(activeChild.id) : () => _advance(activeChild.id),
                  child: Text(_readyToComplete ? 'Finish Cooking' : 'Next Step'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MessageScreen extends StatelessWidget {
  const _MessageScreen({required this.emoji, required this.title, required this.description, required this.onExit, this.buttonLabel = 'Back to Recipes'});

  final String emoji;
  final String title;
  final String description;
  final VoidCallback onExit;
  final String buttonLabel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 56)),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(description, textAlign: TextAlign.center, style: TextStyle(color: AppColors.foreground.withOpacity(0.6))),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: onExit, child: Text(buttonLabel)),
          ],
        ),
      ),
    );
  }
}
