import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/game_summary.dart';
import '../../models/recipe_summary.dart';

class ProgressCard extends StatelessWidget {
  const ProgressCard({super.key, required this.label, required this.value, this.accentColor = AppColors.primary});

  final String label;
  final Object value;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4))),
            const SizedBox(height: 6),
            Text('$value', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Container(height: 4, width: 36, decoration: BoxDecoration(color: accentColor, borderRadius: BorderRadius.circular(999))),
          ],
        ),
      ),
    );
  }
}

/// Locked state is server-derived (`game.unlocked`) -- rendered as-is,
/// never decided client-side.
class GameCard extends StatelessWidget {
  const GameCard({super.key, required this.game, this.onTap});

  final GameSummary game;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final locked = game.unlocked == false;

    return Semantics(
      button: !locked,
      label: locked ? '${game.title} (locked)' : 'Play ${game.title}',
      child: InkWell(
        onTap: locked ? null : onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: locked ? AppColors.foreground.withOpacity(0.05) : AppColors.surface,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(locked ? '🔒' : '🎮', style: const TextStyle(fontSize: 28)),
              const SizedBox(height: 6),
              Text(
                game.title,
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w800, color: locked ? AppColors.foreground.withOpacity(0.4) : AppColors.foreground),
              ),
              if (!locked && game.bestStars != null) ...[
                const SizedBox(height: 4),
                Text('${'★' * game.bestStars!}${'☆' * (game.maxStars - game.bestStars!)}', style: const TextStyle(color: Colors.amber)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class RecipeCard extends StatelessWidget {
  const RecipeCard({super.key, required this.recipe, this.onTap});

  final RecipeSummary recipe;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final locked = recipe.unlocked == false;

    return Semantics(
      button: !locked,
      label: locked ? '${recipe.title} (locked)' : 'View ${recipe.title}',
      child: InkWell(
        onTap: locked ? null : onTap,
        borderRadius: BorderRadius.circular(24),
        child: Opacity(
          opacity: locked ? 0.5 : 1,
          child: Container(
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24)),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 96,
                  width: double.infinity,
                  color: AppColors.foreground.withOpacity(0.05),
                  alignment: Alignment.center,
                  child: Text(locked ? '🔒' : '🍽️', style: const TextStyle(fontSize: 32)),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 6,
                        children: [
                          _tag('${recipe.stepCount} steps'),
                          _tag(recipe.difficulty),
                          _tag('${recipe.totalTimeMinutes} min'),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(recipe.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                      if (recipe.shortDescription != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          recipe.shortDescription!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: AppColors.foreground.withOpacity(0.6)),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _tag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: AppColors.foreground.withOpacity(0.06), borderRadius: BorderRadius.circular(999)),
      child: Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }
}
