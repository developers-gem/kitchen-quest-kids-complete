/// One step, shaped for the child (shapeStepForChild in
/// recipeModeShaper.js -- simpleInstruction preferred over the full
/// instruction, safety flagged as a single needsGrownUp boolean rather
/// than exposing the raw safetyLevel enum to a child-facing screen).
class CurrentStepView {
  const CurrentStepView({
    required this.stepNumber,
    required this.totalSteps,
    required this.title,
    required this.instruction,
    this.image,
    required this.needsGrownUp,
  });

  final int stepNumber;
  final int totalSteps;
  final String title;
  final String instruction;
  final String? image;
  final bool needsGrownUp;

  factory CurrentStepView.fromJson(Map<String, dynamic> json) {
    return CurrentStepView(
      stepNumber: (json['stepNumber'] as num).toInt(),
      totalSteps: (json['totalSteps'] as num).toInt(),
      title: json['title'] as String,
      instruction: json['instruction'] as String,
      image: json['image'] as String?,
      needsGrownUp: json['needsGrownUp'] as bool? ?? false,
    );
  }
}

/// The shape shared by startCooking/getCurrentStep/advanceStep --
/// IMPORTANT: `currentStep` is nullable and `readyToComplete` must
/// always be checked. This mirrors a real backend bug found and fixed
/// while building the web client (recipe.service.js's startCooking used
/// to crash reading recipe.steps[totalSteps] -- out of bounds -- when a
/// child re-opened a recipe after stepping through everything without
/// completing or pausing). Both backend endpoints now correctly report
/// `currentStep: null` + `readyToComplete: true` in that case instead of
/// crashing, and this client must render that state rather than assume
/// currentStep is always present.
class StepProgressResult {
  const StepProgressResult({required this.progressId, required this.status, required this.currentStep, required this.readyToComplete});

  final String progressId;
  final String status;
  final CurrentStepView? currentStep;
  final bool readyToComplete;

  factory StepProgressResult.fromJson(Map<String, dynamic> json) {
    final progress = json['progress'] as Map<String, dynamic>;
    final rawStep = json['currentStep'] as Map<String, dynamic>?;
    return StepProgressResult(
      progressId: progress['_id'] as String,
      status: progress['status'] as String,
      currentStep: rawStep != null ? CurrentStepView.fromJson(rawStep) : null,
      readyToComplete: json['readyToComplete'] as bool? ?? false,
    );
  }
}

class CompleteCookingResult {
  const CompleteCookingResult({required this.xpEarned, required this.isFirstCompletion, required this.pendingParentVerification});

  final int xpEarned;
  final bool isFirstCompletion;
  final bool pendingParentVerification;

  factory CompleteCookingResult.fromJson(Map<String, dynamic> json) {
    final progress = json['progress'] as Map<String, dynamic>;
    return CompleteCookingResult(
      xpEarned: (progress['xpEarned'] as num).toInt(),
      isFirstCompletion: progress['isFirstCompletion'] as bool,
      pendingParentVerification: progress['pendingParentVerification'] as bool,
    );
  }
}
