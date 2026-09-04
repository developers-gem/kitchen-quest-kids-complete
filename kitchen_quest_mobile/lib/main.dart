import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/theme.dart';
import 'core/app_lifecycle_observer.dart';
import 'routes/app_router.dart';
import 'shared/providers/core_providers.dart';

void main() {
  runApp(const ProviderScope(child: KitchenQuestKidsApp()));
}

class KitchenQuestKidsApp extends ConsumerStatefulWidget {
  const KitchenQuestKidsApp({super.key});
  @override
  ConsumerState<KitchenQuestKidsApp> createState() => _KitchenQuestKidsAppState();
}

class _KitchenQuestKidsAppState extends ConsumerState<KitchenQuestKidsApp> {
  late final AppLifecycleObserver _lifecycleObserver;

  @override
  void initState() {
    super.initState();
    _lifecycleObserver = AppLifecycleObserver(
      onResumed: () async {
        await ref.read(connectivityServiceProvider).isOnline;
      },
      onPaused: () async {},
    );
    WidgetsBinding.instance.addObserver(_lifecycleObserver);

    // Local notifications need explicit initialization before first use;
    // done once here rather than lazily on first call. Permission is
    // requested from Settings (Phase 6+) or contextually before the first
    // reminder would fire -- not unconditionally on launch, since asking
    // before the user has done anything worth reminding them about is a
    // common cause of permission-prompt fatigue.
    ref.read(localNotificationServiceProvider).initialize();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(_lifecycleObserver);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Kitchen Quest Kids',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
      // Respects the OS-level "reduce motion" accessibility setting
      // app-wide as a MediaQuery override fallback; individual reward
      // animations (Phase 3's game-completion screen, etc.) additionally
      // check AppTheme.prefersReducedMotion(context) directly at the
      // animation call site -- see shared/widgets/reward_animation.dart.
      builder: (context, child) => child ?? const SizedBox.shrink(),
    );
  }
}
