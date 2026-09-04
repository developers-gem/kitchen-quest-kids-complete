import 'package:flutter/material.dart';
import '../../config/theme.dart';

/// Reward celebration (star burst / scale-in) used on game/recipe
/// completion screens (Phase 3/4). Checks
/// `MediaQuery.of(context).disableAnimations` -- the Flutter-level signal
/// for the OS "reduce motion" accessibility setting -- and renders a
/// static version instantly if it's on, rather than skipping the reward
/// entirely. The requirement is "respect reduced motion," not "hide
/// celebrations from children who need reduced motion," so the star and
/// message still appear -- they just don't animate in.
class RewardAnimation extends StatefulWidget {
  const RewardAnimation({super.key, required this.stars, required this.xpEarned});

  final int stars;
  final int xpEarned;

  @override
  State<RewardAnimation> createState() => _RewardAnimationState();
}

class _RewardAnimationState extends State<RewardAnimation> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    final reduceMotion = AppTheme.prefersReducedMotion(context);
    _controller = AnimationController(
      vsync: this,
      duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 500),
    );
    _scale = CurvedAnimation(parent: _controller, curve: Curves.elasticOut);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(3, (i) {
              final filled = i < widget.stars;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(filled ? '⭐' : '☆', style: const TextStyle(fontSize: 40)),
              );
            }),
          ),
          const SizedBox(height: 12),
          Text('+${widget.xpEarned} XP', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.primary)),
        ],
      ),
    );
  }
}
