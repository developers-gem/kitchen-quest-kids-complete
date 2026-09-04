import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/progress_card.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/games_controller.dart';

/// Mirrors the web app's GamesListPage.tsx: browse via the
/// already-built GameCard, against a backend contract that was already
/// complete. Tapping an unlocked game navigates to the play screen;
/// GameCard already disables tap for locked games (game.unlocked ==
/// false), matching the web behavior exactly.
class GamesListScreen extends ConsumerStatefulWidget {
  const GamesListScreen({super.key});

  @override
  ConsumerState<GamesListScreen> createState() => _GamesListScreenState();
}

class _GamesListScreenState extends ConsumerState<GamesListScreen> {
  final _searchController = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeChild = ref.watch(activeChildProvider);
    final gamesAsync = ref.watch(gamesListProvider((childId: activeChild?.id, search: _search)));

    return Scaffold(
      appBar: AppBar(title: const Text('Games')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(hintText: 'Search games...', prefixIcon: Icon(Icons.search)),
              onChanged: (value) => setState(() => _search = value),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: gamesAsync.when(
                loading: () => const LoadingState(label: 'Loading games...'),
                error: (err, _) => ErrorState(
                  message: ErrorState.messageFor(err),
                  onRetry: () => ref.invalidate(gamesListProvider),
                ),
                data: (games) {
                  if (games.isEmpty) {
                    return const EmptyState(title: 'No games found', description: 'Try a different search, or check back soon!');
                  }
                  return GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.1,
                    ),
                    itemCount: games.length,
                    itemBuilder: (context, index) {
                      final game = games[index];
                      return GameCard(game: game, onTap: () => context.push('/games/${game.slug}'));
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
