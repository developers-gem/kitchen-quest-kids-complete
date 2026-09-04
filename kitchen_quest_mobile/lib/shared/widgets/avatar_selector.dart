import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/avatar.dart';

const Map<String, Color> avatarToneColors = {
  'primary': Color(0xFFFFD9CE),
  'secondary': Color(0xFFFFE8B0),
  'accent': Color(0xFFD7F2C7),
  'neutral': Color(0xFFEDEAE0),
};

Color toneColor(String? tone) => avatarToneColors[tone] ?? avatarToneColors['neutral']!;

const Map<String, String> _slotLabels = {
  'hat': 'HATS',
  'accessory': 'ACCESSORIES',
  'background': 'BACKGROUNDS',
  'colorVariant': 'COLOR VARIANTS',
};

class AvatarSelector extends StatelessWidget {
  const AvatarSelector({
    super.key,
    required this.catalog,
    required this.selectedCharacterId,
    required this.selectedColor,
    required this.onSelectCharacter,
    required this.onSelectColor,
    this.selectedCosmeticIds = const [],
    this.onToggleCosmetic,
  });

  final AvatarCatalog catalog;
  final String? selectedCharacterId;
  final String selectedColor;
  final ValueChanged<String> onSelectCharacter;
  final ValueChanged<String> onSelectColor;
  final List<String> selectedCosmeticIds;
  final ValueChanged<String>? onToggleCosmetic;

  @override
  Widget build(BuildContext context) {
    // Grouped by slot so "Hats" and "Accessories" render as their own
    // sections rather than one undifferentiated grid -- mirrors how an
    // admin actually authors these (each cosmetic declares one slot).
    final cosmeticsBySlot = <String, List<AvatarCosmetic>>{};
    for (final cosmetic in catalog.cosmetics) {
      cosmeticsBySlot.putIfAbsent(cosmetic.slot, () => []).add(cosmetic);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('AVATAR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4))),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: catalog.characters.map((c) {
            final selected = c.id == selectedCharacterId;
            return GestureDetector(
              onTap: () => onSelectCharacter(c.id),
              child: Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? AppColors.foreground : AppColors.foreground.withOpacity(0.05),
                ),
                child: Text(c.emoji ?? '🧑‍🍳', style: const TextStyle(fontSize: 20)),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        Text('COLOR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4))),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: catalog.colors.map((tone) {
            final selected = tone.id == selectedColor;
            return GestureDetector(
              onTap: () => onSelectColor(tone.id),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: toneColor(tone.id),
                  border: Border.all(color: selected ? AppColors.foreground : Colors.transparent, width: 2),
                ),
              ),
            );
          }).toList(),
        ),
        for (final entry in cosmeticsBySlot.entries) ...[
          const SizedBox(height: 16),
          Text(
            _slotLabels[entry.key] ?? entry.key.toUpperCase(),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.foreground.withOpacity(0.4)),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: entry.value.map((cosmetic) {
              final locked = cosmetic.unlocked == false;
              final selected = selectedCosmeticIds.contains(cosmetic.id);
              return GestureDetector(
                onTap: locked ? null : () => onToggleCosmetic?.call(cosmetic.id),
                child: Opacity(
                  opacity: locked ? 0.4 : 1.0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: selected ? AppColors.foreground.withOpacity(0.1) : AppColors.foreground.withOpacity(0.05),
                      border: Border.all(color: selected ? AppColors.foreground : Colors.transparent, width: 2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (locked) const Padding(padding: EdgeInsets.only(right: 4), child: Icon(Icons.lock, size: 14)),
                        Text(cosmetic.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}
