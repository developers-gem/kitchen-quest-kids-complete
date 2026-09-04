import 'package:flutter/material.dart';
import '../../../config/theme.dart';
import '../../../models/game_session.dart';

/// The one gameType with a real interactive player -- mirrors the web
/// app's QuizPlayer.tsx exactly. `questions` is always the REDACTED
/// shape delivered by /games/:id/start; this widget has no way to know
/// which option is correct, matching the backend's server-only-scoring
/// design.
class QuizPlayerWidget extends StatefulWidget {
  const QuizPlayerWidget({super.key, required this.questions, required this.onFinish});

  final List<QuizQuestion> questions;
  final void Function(List<Map<String, String>> answers) onFinish;

  @override
  State<QuizPlayerWidget> createState() => _QuizPlayerWidgetState();
}

class _QuizPlayerWidgetState extends State<QuizPlayerWidget> {
  int _index = 0;
  final Map<String, String> _answers = {};
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    final question = widget.questions[_index];
    final isLast = _index == widget.questions.length - 1;
    final selected = _answers[question.id];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LinearProgressIndicator(value: (_index + 1) / widget.questions.length),
          const SizedBox(height: 8),
          Text(
            'Question ${_index + 1} of ${widget.questions.length}',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.foreground.withOpacity(0.4)),
          ),
          const SizedBox(height: 16),
          Text(
            question.prompt,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 24),
          ...question.options.map((option) {
            final isSelected = selected == option.id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: OutlinedButton(
                onPressed: () => setState(() => _answers[question.id] = option.id),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: isSelected ? AppColors.primary.withOpacity(0.1) : null,
                  side: BorderSide(color: isSelected ? AppColors.primary : AppColors.foreground.withOpacity(0.1), width: 2),
                  alignment: Alignment.centerLeft,
                ),
                child: Text(option.text, style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            );
          }),
          const Spacer(),
          ElevatedButton(
            onPressed: selected == null || _submitting
                ? null
                : () async {
                    if (!isLast) {
                      setState(() => _index += 1);
                      return;
                    }
                    setState(() => _submitting = true);
                    final payload = _answers.entries.map((e) => {'questionId': e.key, 'selectedOptionId': e.value}).toList();
                    widget.onFinish(payload);
                  },
            child: Text(_submitting ? 'Checking...' : (isLast ? 'Finish' : 'Next')),
          ),
        ],
      ),
    );
  }
}
