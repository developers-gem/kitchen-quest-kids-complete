import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/application/auth_controller.dart';
import '../providers/core_providers.dart';
import '../../config/theme.dart';

/// Usage: `final ok = await ensureParentalGate(context, ref); if (!ok) return;`
/// before calling any gated endpoint (create/edit/delete a child, the
/// parent dashboard, verifying a recipe). If a still-valid gate token
/// already exists in [TokenStore], resolves `true` immediately with no UI.
/// Mirrors the web app's `ParentalGateContext.ensureGate()` exactly.
Future<bool> ensureParentalGate(BuildContext context, WidgetRef ref) async {
  final tokenStore = ref.read(tokenStoreProvider);
  if (tokenStore.gateToken != null) return true;

  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const ParentalGateDialog(),
  );
  return result ?? false;
}

class ParentalGateDialog extends ConsumerStatefulWidget {
  const ParentalGateDialog({super.key});

  @override
  ConsumerState<ParentalGateDialog> createState() => _ParentalGateDialogState();
}

class _ParentalGateDialogState extends ConsumerState<ParentalGateDialog> {
  String? _question;
  String? _challengeToken;
  final _answerController = TextEditingController();
  String? _error;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadChallenge();
  }

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  Future<void> _loadChallenge() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(authRepositoryProvider);
      final challenge = await repo.requestParentalGateChallenge();
      setState(() {
        _question = challenge.question;
        _challengeToken = challenge.challengeToken;
      });
    } catch (_) {
      setState(() => _error = "Couldn't load the check. Please try again.");
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final challengeToken = _challengeToken;
    final answer = int.tryParse(_answerController.text);
    if (challengeToken == null || answer == null) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final repo = ref.read(authRepositoryProvider);
      final gateToken = await repo.verifyParentalGate(challengeToken, answer);
      ref.read(tokenStoreProvider).setGateToken(gateToken);
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      setState(() => _error = "That's not quite right -- try again.");
      _answerController.clear();
      await _loadChallenge();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GROWN-UPS ONLY',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1, color: AppColors.foreground.withOpacity(0.5)),
            ),
            const SizedBox(height: 4),
            const Text('Quick check', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            const Text('Solve this to continue.'),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(color: AppColors.foreground.withOpacity(0.05), borderRadius: BorderRadius.circular(20)),
              alignment: Alignment.center,
              child: _loading
                  ? const SizedBox(height: 28, width: 28, child: CircularProgressIndicator(strokeWidth: 3))
                  : Text(_question ?? '...', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _answerController,
              autofocus: true,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: const InputDecoration(hintText: 'Your answer'),
              onChanged: (_) => setState(() {}),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: AppColors.danger), textAlign: TextAlign.center),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _challengeToken == null || _submitting || _answerController.text.isEmpty ? null : _submit,
                    child: Text(_submitting ? 'Checking...' : 'Continue'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
