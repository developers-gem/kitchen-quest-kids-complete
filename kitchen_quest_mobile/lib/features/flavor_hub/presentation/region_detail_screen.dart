import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/flavor_hub_controller.dart';

class RegionDetailScreen extends ConsumerWidget {
  const RegionDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeChild = ref.watch(activeChildProvider);
    final detailAsync = ref.watch(regionDetailProvider((slug: slug, childId: activeChild?.id)));

    return Scaffold(
      appBar: AppBar(title: const Text('Region')),
      body: detailAsync.when(
        loading: () => const LoadingState(label: 'Loading region...'),
        error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
        data: (region) {
          if (region.unlocked == false) {
            return EmptyState(
              icon: '🔒',
              title: '${region.name} is locked',
              description: 'Keep playing and leveling up to unlock this region!',
              action: OutlinedButton(onPressed: () => context.pop(), child: const Text('Back to Flavor Hub')),
            );
          }

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Column(
                    children: [
                      const Text('🗺️', style: TextStyle(fontSize: 48)),
                      const SizedBox(height: 8),
                      Text(region.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                      if (region.state != null)
                        Text(region.state!, style: TextStyle(color: AppColors.foreground.withOpacity(0.6))),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text('Games in this region', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.foreground)),
                const SizedBox(height: 12),
                Expanded(
                  child: region.games.isEmpty
                      ? const EmptyState(
                          title: 'No games here yet',
                          description: 'Check back soon for new food adventures in this region!',
                        )
                      : GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.9,
                          ),
                          itemCount: region.games.length,
                          itemBuilder: (context, index) {
                            final game = region.games[index];
                            // FIXED (gap investigation): these tiles
                            // used to be static, non-interactive
                            // Containers with no way to actually play
                            // the game from here. Links to the same
                            // GamePlayScreen every other entry point
                            // uses; that screen already handles a
                            // locked game correctly on its own (this
                            // list doesn't carry per-game unlock info,
                            // and doesn't need to).
                            return InkWell(
                              onTap: () => context.push('/games/${game.slug}'),
                              borderRadius: BorderRadius.circular(24),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24)),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text('🎮', style: TextStyle(fontSize: 24)),
                                    const SizedBox(height: 6),
                                    Text(
                                      game.title,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                    ),
                                    Text(
                                      game.gameType,
                                      style: TextStyle(fontSize: 10, color: AppColors.foreground.withOpacity(0.4)),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
