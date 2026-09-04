class AvatarCharacter {
  const AvatarCharacter({required this.id, required this.characterId, required this.label, this.emoji});

  final String id;
  final String characterId;
  final String label;
  final String? emoji;

  factory AvatarCharacter.fromJson(Map<String, dynamic> json) {
    return AvatarCharacter(
      id: json['_id'] as String,
      characterId: json['characterId'] as String,
      label: json['label'] as String,
      emoji: json['emoji'] as String?,
    );
  }
}

class AvatarColorOption {
  const AvatarColorOption({required this.id, required this.label});

  final String id;
  final String label;

  factory AvatarColorOption.fromJson(Map<String, dynamic> json) {
    return AvatarColorOption(id: json['id'] as String, label: json['label'] as String);
  }
}

class AvatarCosmetic {
  const AvatarCosmetic({required this.id, required this.label, required this.slot, required this.assetKey, this.unlocked});

  final String id;
  final String label;
  final String slot; // "hat" | "accessory" | "background" | "colorVariant"
  final String assetKey;
  // Present only when the request included a childId -- see
  // avatar.service.js's listAvatarCatalog, evaluated via the same
  // shared unlockRuleEngine every other content type uses.
  final bool? unlocked;

  factory AvatarCosmetic.fromJson(Map<String, dynamic> json) {
    return AvatarCosmetic(
      id: json['_id'] as String,
      label: json['label'] as String,
      slot: json['slot'] as String,
      assetKey: json['assetKey'] as String,
      unlocked: json['unlocked'] as bool?,
    );
  }
}

class AvatarCatalog {
  const AvatarCatalog({required this.characters, required this.colors, required this.cosmetics});

  final List<AvatarCharacter> characters;
  final List<AvatarColorOption> colors;
  // FIXED: this was missing entirely -- the backend has fully supported
  // avatar cosmetics (admin-authored, unlock-rule-gated) since an
  // earlier session, but neither this model nor AvatarSelector ever
  // consumed it, so this client never rendered cosmetics or their
  // locked state anywhere despite the feature being complete
  // server-side. Same gap, same fix, as the web client.
  final List<AvatarCosmetic> cosmetics;

  factory AvatarCatalog.fromJson(Map<String, dynamic> json) {
    return AvatarCatalog(
      characters: (json['characters'] as List<dynamic>? ?? const [])
          .map((e) => AvatarCharacter.fromJson(e as Map<String, dynamic>))
          .toList(),
      colors: (json['colors'] as List<dynamic>? ?? const [])
          .map((e) => AvatarColorOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      cosmetics: (json['cosmetics'] as List<dynamic>? ?? const [])
          .map((e) => AvatarCosmetic.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
