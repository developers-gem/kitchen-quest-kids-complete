import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/parental_gate_dialog.dart';
import '../../child_profiles/application/active_child_controller.dart';
import '../application/parent_dashboard_controller.dart';

/// Mirrors the web app's ParentDashboardPage.tsx: six tabs against
/// dashboard.service.js's already-complete, already-tested contract.
/// Gated once for the whole screen (matching the backend's own
/// `requireParentalGate()` applied to the entire router, not
/// per-endpoint) rather than re-prompting per tab.
class ParentDashboardScreen extends ConsumerStatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  ConsumerState<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends ConsumerState<ParentDashboardScreen> {
  bool _gateChecked = false;
  bool _gateDenied = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final ok = await ensureParentalGate(context, ref);
      if (mounted) {
        setState(() {
          _gateChecked = true;
          _gateDenied = !ok;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_gateChecked) {
      return const Scaffold(body: LoadingState(label: 'Checking access...'));
    }

    if (_gateDenied) {
      return Scaffold(
        appBar: AppBar(title: const Text('Parent Dashboard')),
        body: const EmptyState(
          icon: '🔒',
          title: 'Grown-ups only',
          description: "You'll need to pass the quick check to view the parent dashboard.",
        ),
      );
    }

    final children = ref.watch(childrenControllerProvider).valueOrNull ?? const [];
    final activeChild = ref.watch(activeChildProvider);

    if (children.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Parent Dashboard')),
        body: const EmptyState(icon: '🧑‍🍳', title: 'No chefs yet!', description: 'Add a child profile to see their progress here.'),
      );
    }

    if (activeChild == null) return const Scaffold(body: LoadingState());

    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          title: Text("${activeChild.displayName}'s Dashboard"),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'This Week'),
              Tab(text: 'Learning'),
              Tab(text: 'Activity'),
              Tab(text: 'Grocery'),
              Tab(text: 'Settings'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _OverviewTab(childId: activeChild.id),
            _WeeklySummaryTab(childId: activeChild.id),
            _LearningProgressTab(childId: activeChild.id),
            _ActivityTab(childId: activeChild.id),
            const _GroceryTab(),
            const _SettingsTab(),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final Object value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4))),
          const SizedBox(height: 6),
          Text('$value', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.childId});
  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(dashboardOverviewProvider(childId));

    return overviewAsync.when(
      loading: () => const LoadingState(),
      error: (err, _) => ErrorState(message: ErrorState.messageFor(err), onRetry: () => ref.invalidate(dashboardOverviewProvider)),
      data: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.6,
            children: [
              _StatCard(label: 'Total XP', value: data.totalXP),
              _StatCard(label: 'Current Streak', value: data.currentStreak),
              _StatCard(label: 'Longest Streak', value: data.longestStreak),
              _StatCard(label: 'XP This Week', value: data.weeklyXpEarned),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Recent activity', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          if (data.recentActivity.isEmpty)
            const EmptyState(title: 'No activity yet', description: 'Recent games and recipes will show up here.')
          else
            ...data.recentActivity.map(
              (a) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(a.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(
                  '${a.type == 'game' ? 'Game' : 'Recipe'} · ${a.date.toLocal().toString().split(' ').first}'
                  '${a.pendingParentVerification == true ? ' · Waiting for your verification' : ''}',
                ),
                trailing: Text('+${a.xpEarned} XP', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.accent)),
              ),
            ),
        ],
      ),
    );
  }
}

class _WeeklySummaryTab extends ConsumerWidget {
  const _WeeklySummaryTab({required this.childId});
  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(weeklySummaryProvider(childId));

    return summaryAsync.when(
      loading: () => const LoadingState(),
      error: (err, _) => ErrorState(message: ErrorState.messageFor(err), onRetry: () => ref.invalidate(weeklySummaryProvider)),
      data: (data) => GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        shrinkWrap: true,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.6,
        children: [
          _StatCard(label: 'Games Completed', value: data.gamesCompleted),
          _StatCard(label: 'Recipes Completed', value: data.recipesCompleted),
          _StatCard(label: 'Foods Tried', value: data.foodsTried),
          _StatCard(label: 'Nutrition Lessons', value: data.nutritionLessonsCompleted),
          _StatCard(label: 'XP Earned', value: data.totalXPEarned),
          _StatCard(label: 'Current Streak', value: data.currentStreak),
        ],
      ),
    );
  }
}

class _TagList extends StatelessWidget {
  const _TagList({required this.items, required this.empty});
  final List<String> items;
  final String empty;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Text(empty, style: TextStyle(color: AppColors.foreground.withOpacity(0.5)));
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items.map((item) => Chip(label: Text(item))).toList(),
    );
  }
}

class _LearningProgressTab extends ConsumerWidget {
  const _LearningProgressTab({required this.childId});
  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progressAsync = ref.watch(learningProgressProvider(childId));

    return progressAsync.when(
      loading: () => const LoadingState(),
      error: (err, _) => ErrorState(message: ErrorState.messageFor(err), onRetry: () => ref.invalidate(learningProgressProvider)),
      data: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Nutrition topics explored', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          _TagList(items: data.nutritionTopicsExplored, empty: 'No nutrition topics explored yet.'),
          const SizedBox(height: 20),
          const Text('Cooking skills learned', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          _TagList(items: data.cookingSkillsLearned, empty: 'No cooking skills logged yet.'),
          const SizedBox(height: 20),
          const Text('Foods discovered', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          _TagList(items: data.foodsDiscovered, empty: 'No foods discovered yet.'),
          const SizedBox(height: 20),
          const Text('Regions explored', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          _TagList(items: data.regionsUnlocked, empty: 'No regions explored yet.'),
        ],
      ),
    );
  }
}

class _ActivityTab extends ConsumerStatefulWidget {
  const _ActivityTab({required this.childId});
  final String childId;

  @override
  ConsumerState<_ActivityTab> createState() => _ActivityTabState();
}

class _ActivityTabState extends ConsumerState<_ActivityTab> {
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(activityHistoryProvider((childId: widget.childId, page: _page)));

    return historyAsync.when(
      loading: () => const LoadingState(),
      error: (err, _) => ErrorState(message: ErrorState.messageFor(err), onRetry: () => ref.invalidate(activityHistoryProvider)),
      data: (page) {
        if (page.entries.isEmpty) {
          return const EmptyState(title: 'No activity yet', description: 'A full history of games and recipes will show up here.');
        }
        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: page.entries
                    .map((a) => ListTile(
                          title: Text(a.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(a.date.toLocal().toString()),
                          trailing: Text('+${a.xpEarned} XP', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.accent)),
                        ))
                    .toList(),
              ),
            ),
            if (page.totalPages > 1)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton(onPressed: _page > 1 ? () => setState(() => _page -= 1) : null, child: const Text('Previous')),
                    Text('Page ${page.page} of ${page.totalPages}'),
                    TextButton(onPressed: _page < page.totalPages ? () => setState(() => _page += 1) : null, child: const Text('Next')),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _GroceryTab extends ConsumerWidget {
  const _GroceryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groceryAsync = ref.watch(groceryOverviewProvider);

    return groceryAsync.when(
      loading: () => const LoadingState(),
      error: (err, _) => ErrorState(message: ErrorState.messageFor(err), onRetry: () => ref.invalidate(groceryOverviewProvider)),
      data: (counts) => GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        shrinkWrap: true,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.6,
        children: [
          _StatCard(label: 'Items needed', value: counts.neededCount),
          _StatCard(label: 'Items checked off', value: counts.checkedCount),
        ],
      ),
    );
  }
}

class _SettingsTab extends ConsumerWidget {
  const _SettingsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(parentSettingsProvider);

    return settingsAsync.when(
      loading: () => const LoadingState(),
      error: (err, _) => ErrorState(message: ErrorState.messageFor(err), onRetry: () => ref.invalidate(parentSettingsProvider)),
      data: (settings) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Account', style: TextStyle(fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text('Email verified: ${settings.emailVerified ? 'Yes' : 'No'}'),
                Text('Account status: ${settings.accountStatus}'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Children', style: TextStyle(fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                ...settings.children.map((c) => Text(c.displayName)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
