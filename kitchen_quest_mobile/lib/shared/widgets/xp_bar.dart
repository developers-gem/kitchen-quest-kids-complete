import 'package:flutter/material.dart';
import '../../config/theme.dart';

/// Purely presentational -- mirrors the web app's XPBar.tsx. The
/// level/XP-within-level math (level N = N*100 cumulative XP) is used
/// ONLY to decide how full the bar looks; currentLevel/totalXP always
/// come from the API, this widget never computes what level someone is.
class XPBar extends StatelessWidget {
  const XPBar({super.key, required this.currentLevel, required this.totalXP, this.xpPerLevel = 100});

  final int currentLevel;
  final int totalXP;
  final int xpPerLevel;

  @override
  Widget build(BuildContext context) {
    final xpIntoLevel = totalXP % xpPerLevel;
    final percent = (xpIntoLevel / xpPerLevel).clamp(0.0, 1.0);

    return Semantics(
      label: 'Level $currentLevel, $xpIntoLevel of $xpPerLevel XP to next level',
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: AppColors.foreground.withOpacity(0.1), borderRadius: BorderRadius.circular(999)),
            child: Text('LVL $currentLevel', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: percent,
                minHeight: 10,
                backgroundColor: AppColors.foreground.withOpacity(0.1),
                valueColor: const AlwaysStoppedAnimation(AppColors.accent),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text('$totalXP XP', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.foreground.withOpacity(0.5))),
        ],
      ),
    );
  }
}

class StreakBadge extends StatelessWidget {
  const StreakBadge({super.key, required this.currentStreak});

  final int currentStreak;

  @override
  Widget build(BuildContext context) {
    if (currentStreak <= 0) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(color: AppColors.foreground.withOpacity(0.05), borderRadius: BorderRadius.circular(999)),
        child: Text('Start a streak today!', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.foreground.withOpacity(0.5))),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.35), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🔥'),
          const SizedBox(width: 6),
          Text('$currentStreak Day${currentStreak == 1 ? '' : 's'} Streak', style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
