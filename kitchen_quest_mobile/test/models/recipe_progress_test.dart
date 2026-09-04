import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/recipe_progress.dart';

void main() {
  group('StepProgressResult.fromJson', () {
    test('parses a normal in-progress step', () {
      final result = StepProgressResult.fromJson({
        'progress': {'_id': 'progress-1', 'status': 'inProgress', 'currentStepIndex': 0},
        'currentStep': {
          'stepNumber': 1,
          'totalSteps': 2,
          'title': 'Wash',
          'instruction': 'Wash the veggies',
          'needsGrownUp': false,
        },
        'readyToComplete': false,
      });

      expect(result.progressId, 'progress-1');
      expect(result.currentStep, isNotNull);
      expect(result.currentStep!.title, 'Wash');
      expect(result.readyToComplete, false);
    });

    test(
      'parses currentStep as null with readyToComplete true -- the exact shape of the '
      'real backend bug fixed while building the web client (recipe.service.js startCooking '
      'used to crash reading recipe.steps[totalSteps] instead of returning this)',
      () {
        final result = StepProgressResult.fromJson({
          'progress': {'_id': 'progress-1', 'status': 'inProgress', 'currentStepIndex': 2},
          'currentStep': null,
          'readyToComplete': true,
        });

        expect(result.currentStep, isNull);
        expect(result.readyToComplete, true);
        // The critical assertion: this must NOT throw trying to read
        // fields off a null currentStep.
      },
    );

    test('defaults readyToComplete to false when absent (defensive, should not happen in practice)', () {
      final result = StepProgressResult.fromJson({
        'progress': {'_id': 'progress-1', 'status': 'inProgress', 'currentStepIndex': 0},
        'currentStep': {'stepNumber': 1, 'totalSteps': 1, 'title': 'Only step', 'instruction': 'Do it', 'needsGrownUp': false},
      });

      expect(result.readyToComplete, false);
    });
  });

  group('CompleteCookingResult.fromJson', () {
    test('parses a completed, non-verification-required recipe', () {
      final result = CompleteCookingResult.fromJson({
        'progress': {
          '_id': 'progress-1',
          'status': 'completed',
          'xpEarned': 45,
          'isFirstCompletion': true,
          'pendingParentVerification': false,
        },
      });

      expect(result.xpEarned, 45);
      expect(result.isFirstCompletion, true);
      expect(result.pendingParentVerification, false);
    });

    test('parses a completed recipe pending parent verification with zero XP held', () {
      final result = CompleteCookingResult.fromJson({
        'progress': {
          '_id': 'progress-1',
          'status': 'completed',
          'xpEarned': 0,
          'isFirstCompletion': true,
          'pendingParentVerification': true,
        },
      });

      expect(result.xpEarned, 0);
      expect(result.pendingParentVerification, true);
    });
  });
}
