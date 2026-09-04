import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../shared/widgets/child_header.dart';
import '../../../shared/widgets/progress_card.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../../child_profiles/presentation/child_switcher.dart';
import '../data/dashboard_repository.dart';

/// Mirrors the web app's HomeDashboardPage.tsx: greeting, avatar,
/// level/XP, streak, an honest "coming soon" daily-challenge card (no
/// fabricated challenge data -- the DailyChallenge module doesn't exist
/// on the backend yet), progress summary, and featured games/recipes
/// pulled live from the API.
class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final childrenAsync = ref.watch(childrenControllerProvider);
    final activeChild = ref.watch(activeChildProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kitchen Quest Kids'),
        actions: [
          IconButton(
            icon: const Icon(Icons.family_restroom),
            tooltip: 'Parent Dashboard',
            onPressed: () => context.push('/parent'),
          ),
        ],
      ),
      body: childrenAsync.when(
        loading: () => const LoadingState(label: 'Loading your family...'),
        error: (err, _) => ErrorState(
          message: ErrorState.messageFor(err),
          onRetry: () => ref.read(childrenControllerProvider.notifier).refresh(),
        ),
        data: (children) {
          if (children.isEmpty) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: EmptyState(
                icon: '🧑‍🍳',
                title: 'No chefs yet!',
                description: 'Add a child profile to start their food adventure.',
                action: ElevatedButton(
                  onPressed: () => context.push('/children/manage'),
                  child: const Text('Add your first chef'),
                ),
              ),
            );
          }

          if (activeChild == null) return const LoadingState();

          return RefreshIndicator(
            onRefresh: () => ref.read(childrenControllerProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const ChildSwitcher(),
                const SizedBox(height: 20),
                ChildHeader(child: activeChild),
                const SizedBox(height: 20),
                const _DailyChallengeCard(),
                const SizedBox(height: 24),
                const _SectionHeading('Your progress'),
                const SizedBox(height: 10),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.7,
                  children: [
                    ProgressCard(label: 'Games Played', value: activeChild.progressStats.gamesPlayed, accentColor: AppColors.primary),
                    ProgressCard(label: 'Recipes Cooked', value: activeChild.progressStats.recipesCompleted, accentColor: AppColors.secondary),
                    ProgressCard(label: 'Foods Tried', value: activeChild.progressStats.foodsTried, accentColor: AppColors.accent),
                    ProgressCard(label: 'Level', value: activeChild.currentLevel, accentColor: AppColors.foreground),
                  ],
                ),
                const SizedBox(height: 24),
                _FlavorHubBanner(),
                const SizedBox(height: 24),
                _FeaturedGamesSection(childId: activeChild.id),
                const SizedBox(height: 24),
                _FeaturedRecipesSection(childId: activeChild.id),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800));
  }
}

class _DailyChallengeCard extends StatelessWidget {
  const _DailyChallengeCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(24)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DAILY CHALLENGE',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1, color: Colors.white.withOpacity(0.8)),
          ),
          const SizedBox(height: 8),
          const Text(
            'Daily challenges are coming soon!',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            'Check back soon for a brand-new challenge every day.',
            style: TextStyle(color: Colors.white.withOpacity(0.9)),
          ),
        ],
      ),
    );
  }
}

class _FlavorHubBanner extends StatelessWidget {
  const _FlavorHubBanner();

  @override
  Widget build(BuildContext context) {
    // FIXED (gap investigation): this was the one primary section web's
    // AppLayout nav has that had no entry point anywhere on mobile --
    // not a placeholder, an actual missing route. A simple banner here
    // is the minimal honest fix: it doesn't fabricate a "featured
    // regions" preview (which would need its own API call this section
    // never previously made), it just makes the real, already-built
    // FlavorHubScreen reachable.
    return InkWell(
      onTap: () => context.push('/flavor-hub'),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.15), borderRadius: BorderRadius.circular(24)),
        child: Row(
          children: [
            const Text('🗺️', style: TextStyle(fontSize: 28)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Explore the Flavor Hub', style: TextStyle(fontWeight: FontWeight.w900)),
                  Text(
                    'Discover new regions and unlock food adventures',
                    style: TextStyle(fontSize: 12, color: AppColors.foreground.withOpacity(0.6)),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.foreground.withOpacity(0.4)),
          ],
        ),
      ),
    );
  }
}

class _FeaturedGamesSection extends ConsumerWidget {
  const _FeaturedGamesSection({required this.childId});
  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gamesAsync = ref.watch(_featuredGamesProvider(childId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const _SectionHeading('Featured games'),
            TextButton(onPressed: () => context.push('/games'), child: const Text('See all')),
          ],
        ),
        gamesAsync.when(
          loading: () => const LoadingState(label: 'Loading games...'),
          error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
          data: (games) {
            if (games.isEmpty) {
              return const EmptyState(title: 'No games available yet', description: 'Check back soon for new food adventures!');
            }
            return GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.1,
              children: games.map((g) => GameCard(game: g)).toList(),
            );
          },
        ),
      ],
    );
  }
}

class _FeaturedRecipesSection extends ConsumerWidget {
  const _FeaturedRecipesSection({required this.childId});
  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recipesAsync = ref.watch(_featuredRecipesProvider(childId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const _SectionHeading('Featured recipes'),
            TextButton(onPressed: () => context.push('/recipes'), child: const Text('See all')),
          ],
        ),
        recipesAsync.when(
          loading: () => const LoadingState(label: 'Loading recipes...'),
          error: (err, _) => ErrorState(message: ErrorState.messageFor(err)),
          data: (recipes) {
            if (recipes.isEmpty) {
              return const EmptyState(title: 'No recipes available yet', description: 'Check back soon for new dishes to cook!');
            }
            return GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.85,
              children: recipes.map((r) => RecipeCard(recipe: r)).toList(),
            );
          },
        ),
      ],
    );
  }
}

final _featuredGamesProvider = FutureProvider.family((ref, String childId) {
  return ref.watch(dashboardRepositoryProvider).getFeaturedGames(childId);
});

final _featuredRecipesProvider = FutureProvider.family((ref, String childId) {
  return ref.watch(dashboardRepositoryProvider).getFeaturedRecipes(childId);
});
