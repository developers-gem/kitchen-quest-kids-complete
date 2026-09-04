import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../core/failures.dart';

/// Three consistent placeholders used across every screen instead of each
/// one inventing its own loading/error/empty layout -- mirrors the web
/// app's LoadingState/ErrorState/EmptyState components one-for-one.

class LoadingState extends StatelessWidget {
  const LoadingState({super.key, this.label = 'Loading...'});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      liveRegion: true,
      child: const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, this.message, this.onRetry});

  final String? message;
  final VoidCallback? onRetry;

  /// Builds a friendly message from any caught error -- ApiFailure's
  /// `.message` is already user-facing text from the backend; anything
  /// else (a NetworkUnavailableFailure, or an unexpected exception) gets
  /// a generic fallback rather than leaking a stack trace to the child.
  static String messageFor(Object error) {
    if (error is ApiFailure) return error.message;
    if (error is NetworkUnavailableFailure) {
      return "Can't connect right now. Check your internet connection.";
    }
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.1), borderRadius: BorderRadius.circular(24)),
              child: Column(
                children: [
                  Text(
                    message ?? 'Something went wrong.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700),
                  ),
                  if (onRetry != null) ...[
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: onRetry,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                      child: const Text('Try again'),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.description, this.icon, this.action});

  final String title;
  final String? description;
  final String? icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) Text(icon!, style: const TextStyle(fontSize: 40)),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800), textAlign: TextAlign.center),
            if (description != null) ...[
              const SizedBox(height: 6),
              Text(
                description!,
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.foreground.withOpacity(0.6)),
              ),
            ],
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}
