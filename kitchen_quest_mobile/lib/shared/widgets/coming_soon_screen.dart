import 'package:flutter/material.dart';
import 'state_widgets.dart';

/// Used for routes not yet built in this phase -- keeps every nav
/// destination real and navigable rather than a dead link, while being
/// explicit that the screen itself is a placeholder. Mirrors the web
/// app's ComingSoonPage.tsx.
class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({super.key, required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Coming soon')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(child: EmptyState(icon: '🚧', title: title, description: description)),
      ),
    );
  }
}
