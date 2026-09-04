import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../models/region.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/flavor_hub_controller.dart';

/// Closes a real, previously-undiscovered platform-parity gap: unlike
/// every other unbuilt Flutter feature (which at least has a placeholder
/// folder/README), Flavor Hub didn't exist here at all -- not a route,
/// not a nav destination, nothing -- despite being a complete, tested
/// feature on the web client. Mirrors FlavorHubPage.tsx: region list,
/// locked/unlocked per active child.
class FlavorHubScreen extends ConsumerWidget {
  const FlavorHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeChild = ref.watch(activeChildProvider);
    final regionsAsync = ref.watch(regionsListProvider(activeChild?.id));

    return Scaffold(
      appBar: AppBar(title: const Text('Flavor Hub')),
      body: regionsAsync.when(
        loading: () => const LoadingState(label: 'Loading regions...'),
        error: (err, _) => ErrorState(
          message: ErrorState.messageFor(err),
          onRetry: () => ref.invalidate(regionsListProvider),
        ),
        data: (regions) {
          if (regions.isEmpty) {
            return const EmptyState(title: 'No regions available yet', description: 'Check back soon for new places to explore!');
          }
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.9,
            ),
            itemCount: regions.length,
            itemBuilder: (context, index) {
              final region = regions[index];
              return _RegionTile(region: region, onTap: () => context.push('/flavor-hub/${region.slug}'));
            },
          );
        },
      ),
    );
  }
}

class _RegionTile extends StatelessWidget {
  const _RegionTile({required this.region, required this.onTap});

  final RegionSummary region;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final locked = region.unlocked == false;

    return Semantics(
      button: !locked,
      label: locked ? '${region.name} (locked)' : 'Explore ${region.name}',
      child: InkWell(
        onTap: locked ? null : onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: locked ? AppColors.foreground.withOpacity(0.05) : AppColors.surface,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(locked ? '🔒' : '🗺️', style: const TextStyle(fontSize: 24)),
              const SizedBox(height: 6),
              Text(
                region.name,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: locked ? AppColors.foreground.withOpacity(0.4) : AppColors.foreground,
                ),
              ),
              if (!locked) ...[
                const SizedBox(height: 4),
                Text(
                  '${region.gameCount} games',
                  style: TextStyle(fontSize: 11, color: AppColors.foreground.withOpacity(0.5)),
                ),
              ] else
                Text(
                  'Locked',
                  style: TextStyle(fontSize: 11, color: AppColors.foreground.withOpacity(0.4)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
