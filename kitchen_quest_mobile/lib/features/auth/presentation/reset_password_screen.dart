import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../application/auth_controller.dart';
import '../../../shared/widgets/state_widgets.dart';

/// `token` normally arrives pre-filled via a deep link
/// (kitchenquestkids://reset-password?token=... or the https universal
/// link equivalent -- see routes/app_router.dart). A manual field is
/// still shown as a fallback for the rare case a link doesn't carry
/// through cleanly.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.token});

  final String? token;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  late final TextEditingController _tokenController;
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _submitting = false;
  bool _done = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tokenController = TextEditingController(text: widget.token ?? '');
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    if (_tokenController.text.isEmpty) {
      setState(() => _error = 'This reset link is missing its token. Please request a new one.');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      setState(() => _error = "Passwords don't match.");
      return;
    }

    setState(() => _submitting = true);
    try {
      await ref.read(authRepositoryProvider).resetPassword(_tokenController.text, _passwordController.text);
      setState(() => _done = true);
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) context.go('/login');
    } catch (err) {
      setState(() => _error = ErrorState.messageFor(err));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a new password')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _done
              ? const Center(child: Text('Password updated! Taking you to log in...'))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (widget.token == null)
                      TextField(
                        controller: _tokenController,
                        decoration: const InputDecoration(labelText: 'Reset token (from your email link)'),
                      ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'New password'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _confirmController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Confirm new password'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Saving...' : 'Save new password'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
