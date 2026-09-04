import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/application/auth_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/auth/presentation/forgot_password_screen.dart';
import '../features/auth/presentation/reset_password_screen.dart';
import '../features/child_profiles/presentation/manage_children_screen.dart';
import '../features/home/presentation/home_dashboard_screen.dart';
import '../features/flavor_hub/presentation/flavor_hub_screen.dart';
import '../features/flavor_hub/presentation/region_detail_screen.dart';
import '../features/games/presentation/games_list_screen.dart';
import '../features/games/presentation/game_play_screen.dart';
import '../features/recipes/presentation/recipes_list_screen.dart';
import '../features/recipes/presentation/recipe_detail_screen.dart';
import '../features/recipes/presentation/cooking_mode_screen.dart';
import '../features/grocery/presentation/grocery_list_screen.dart';
import '../features/parent_dashboard/presentation/parent_dashboard_screen.dart';

/// DEEP LINKS: go_router handles both the app's in-app navigation and
/// incoming deep links through the same route table -- no separate
/// parsing layer needed. Two link shapes are wired for once real
/// endpoints exist to back them:
///   - `kitchenquestkids://reset-password?token=...` (custom scheme) and
///     the universal-link equivalent `https://kitchenquestkids.com/reset-password?token=...`
///     both resolve to `/reset-password`, reading `token` from the query
///     string exactly like the web app's ResetPasswordPage does -- one
///     password-reset email template, two clients.
///   - a future push notification's `data` payload (see
///     PushNotificationService.onMessage) carrying a route path (e.g.
///     `/recipes/:id/verify`) can call `router.go(path)` directly once
///     the Recipes feature exists.
/// Wiring the actual `AndroidManifest.xml` intent-filter / iOS
/// Associated-Domains entitlement is a native-project configuration step
/// outside `lib/`, not something this router file can do on its own --
/// noted in docs/ARCHITECTURE.md.
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: _AuthChangeNotifier(ref),
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final isAuthenticated = authState.valueOrNull != null;
      final isAuthRoute = _authRoutes.contains(state.matchedLocation);
      final isSplash = state.matchedLocation == '/splash';

      // While the initial silent-login check (or any auth mutation) is in
      // flight, stay on/redirect to the splash screen -- never let a
      // protected route render before we know whether the user is
      // actually authenticated, even for one frame.
      if (authState.isLoading) {
        return isSplash ? null : '/splash';
      }
      if (isSplash) {
        return isAuthenticated ? '/home' : '/login';
      }
      if (!isAuthenticated && !isAuthRoute) return '/login';
      if (isAuthenticated && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) => ResetPasswordScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(path: '/home', builder: (context, state) => const HomeDashboardScreen()),
      GoRoute(path: '/children/manage', builder: (context, state) => const ManageChildrenScreen()),
      GoRoute(
        path: '/flavor-hub',
        builder: (context, state) => const FlavorHubScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (context, state) => RegionDetailScreen(slug: state.pathParameters['slug']!),
          ),
        ],
      ),
      GoRoute(
        path: '/games',
        builder: (context, state) => const GamesListScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (context, state) => GamePlayScreen(slug: state.pathParameters['slug']!),
          ),
        ],
      ),
      GoRoute(
        path: '/recipes',
        builder: (context, state) => const RecipesListScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (context, state) => RecipeDetailScreen(slug: state.pathParameters['slug']!),
            routes: [
              GoRoute(
                path: 'cook',
                builder: (context, state) => CookingModeScreen(slug: state.pathParameters['slug']!),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/grocery',
        builder: (context, state) => const GroceryListScreen(),
      ),
      GoRoute(
        path: '/parent',
        builder: (context, state) => const ParentDashboardScreen(),
      ),
    ],
  );
});

const _authRoutes = {'/login', '/register', '/forgot-password', '/reset-password'};

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('🧑‍🍳', style: TextStyle(fontSize: 48)),
            SizedBox(height: 16),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

/// Bridges Riverpod's AsyncNotifier state changes into a Listenable, which
/// is what go_router's `refreshListenable` expects -- without this, a
/// login/logout wouldn't trigger the router's redirect logic to re-run
/// until some unrelated navigation happened to occur.
class _AuthChangeNotifier extends ChangeNotifier {
  _AuthChangeNotifier(this._ref) {
    _ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}
