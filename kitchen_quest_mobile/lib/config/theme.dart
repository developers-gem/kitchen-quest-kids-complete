import 'package:flutter/material.dart';

/// Color tokens matching src/index.css in the web app exactly, so the
/// three clients (web, iOS, Android) present one consistent visual
/// identity rather than three different-looking apps for one product.
class AppColors {
  static const primary = Color(0xFFFF6B4A);
  static const primaryForeground = Color(0xFFFFFFFF);
  static const secondary = Color(0xFFFFC75F);
  static const accent = Color(0xFF7BC86C);
  static const foreground = Color(0xFF2B2418);
  static const background = Color(0xFFFBF6E9);
  static const surface = Color(0xFFFFFFFF);
  static const danger = Color(0xFFE0524A);
}

class AppTheme {
  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      surface: AppColors.surface,
      error: AppColors.danger,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Nunito',
      // Minimum 44x44 touch targets everywhere -- large-touch-target is an
      // explicit accessibility/child-UX requirement, not a nice-to-have.
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.primaryForeground,
          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      cardTheme: const CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
        color: AppColors.surface,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  /// Read via `AppTheme.prefersReducedMotion(context)` at each reward
  /// animation call site (see shared/widgets/reward_animation.dart) --
  /// Flutter surfaces the OS-level "reduce motion" setting through
  /// MediaQuery, so respecting it is a per-animation check, not a single
  /// global theme flag.
  static bool prefersReducedMotion(BuildContext context) {
    return MediaQuery.of(context).disableAnimations;
  }
}
