import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../auth/application/auth_controller.dart';
import '../application/active_child_controller.dart';
import '../../../shared/widgets/avatar_selector.dart';

/// Supports multiple children under one family (the "Child Switcher"
/// requirement) -- rendered once near the app's root/home app bar so it's
/// available everywhere, not just on the dashboard. Mirrors the web
/// app's ChildSwitcher.jsx.
class ChildSwitcher extends ConsumerWidget {
  const ChildSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final children = ref.watch(childrenControllerProvider).valueOrNull ?? const [];
    final activeId = ref.watch(activeChildIdControllerProvider);
    final userId = ref.watch(authControllerProvider).valueOrNull?.id;

    if (children.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        itemCount: children.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final child = children[index];
          final active = child.id == activeId;
          return Semantics(
            button: true,
            selected: active,
            label: 'Switch to ${child.displayName}',
            child: GestureDetector(
              onTap: userId == null ? null : () => ref.read(activeChildIdControllerProvider.notifier).setActiveChildId(child.id, userId),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: active ? AppColors.foreground : AppColors.foreground.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(radius: 12, backgroundColor: toneColor(child.avatarColor)),
                    const SizedBox(width: 8),
                    Text(
                      child.displayName,
                      style: TextStyle(fontWeight: FontWeight.w800, color: active ? Colors.white : AppColors.foreground.withOpacity(0.7)),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
