import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/child_profile.dart';
import 'avatar_selector.dart';
import 'xp_bar.dart';

class ChildHeader extends StatelessWidget {
  const ChildHeader({super.key, required this.child});

  final ChildProfile child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(radius: 28, backgroundColor: toneColor(child.avatarColor), child: const Text('🧑‍🍳', style: TextStyle(fontSize: 22))),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('WELCOME BACK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.5))),
                  Text('Hi, Chef ${child.displayName}!', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        XPBar(currentLevel: child.currentLevel, totalXP: child.totalXP),
        const SizedBox(height: 10),
        StreakBadge(currentStreak: child.currentStreak),
      ],
    );
  }
}
