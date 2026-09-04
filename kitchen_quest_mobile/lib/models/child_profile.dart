class ProgressStats {
  const ProgressStats({
    required this.gamesPlayed,
    required this.gamesCompleted,
    required this.recipesStarted,
    required this.recipesCompleted,
    required this.foodsTried,
    required this.nutritionQuestsCompleted,
  });

  final int gamesPlayed;
  final int gamesCompleted;
  final int recipesStarted;
  final int recipesCompleted;
  final int foodsTried;
  final int nutritionQuestsCompleted;

  static const empty = ProgressStats(
    gamesPlayed: 0,
    gamesCompleted: 0,
    recipesStarted: 0,
    recipesCompleted: 0,
    foodsTried: 0,
    nutritionQuestsCompleted: 0,
  );

  factory ProgressStats.fromJson(Map<String, dynamic>? json) {
    if (json == null) return empty;
    return ProgressStats(
      gamesPlayed: (json['gamesPlayed'] as num?)?.toInt() ?? 0,
      gamesCompleted: (json['gamesCompleted'] as num?)?.toInt() ?? 0,
      recipesStarted: (json['recipesStarted'] as num?)?.toInt() ?? 0,
      recipesCompleted: (json['recipesCompleted'] as num?)?.toInt() ?? 0,
      foodsTried: (json['foodsTried'] as num?)?.toInt() ?? 0,
      nutritionQuestsCompleted: (json['nutritionQuestsCompleted'] as num?)?.toInt() ?? 0,
    );
  }
}

class AccessibilityPreferences {
  const AccessibilityPreferences({
    this.reducedMotion = false,
    this.largeText = false,
    this.audioNarration = false,
    this.captions = false,
  });

  final bool reducedMotion;
  final bool largeText;
  final bool audioNarration;
  final bool captions;

  factory AccessibilityPreferences.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AccessibilityPreferences();
    return AccessibilityPreferences(
      reducedMotion: json['reducedMotion'] as bool? ?? false,
      largeText: json['largeText'] as bool? ?? false,
      audioNarration: json['audioNarration'] as bool? ?? false,
      captions: json['captions'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'reducedMotion': reducedMotion,
        'largeText': largeText,
        'audioNarration': audioNarration,
        'captions': captions,
      };

  AccessibilityPreferences copyWith({
    bool? reducedMotion,
    bool? largeText,
    bool? audioNarration,
    bool? captions,
  }) {
    return AccessibilityPreferences(
      reducedMotion: reducedMotion ?? this.reducedMotion,
      largeText: largeText ?? this.largeText,
      audioNarration: audioNarration ?? this.audioNarration,
      captions: captions ?? this.captions,
    );
  }
}

/// Mirrors kitchen-quest-api's ChildProfile model / the web app's
/// `ChildProfile` type. Notably absent: any email/password field -- that
/// omission is structural on the backend (children never hold their own
/// credential) and this model doesn't invent one either.
class ChildProfile {
  const ChildProfile({
    required this.id,
    required this.familyId,
    required this.displayName,
    required this.ageRange,
    this.avatarConfigId,
    required this.avatarColor,
    required this.currentLevel,
    required this.totalXP,
    required this.currentStreak,
    required this.longestStreak,
    this.lastActivityDate,
    required this.progressStats,
    this.accessibilityPreferences,
  });

  final String id;
  final String familyId;
  final String displayName;
  final String ageRange;
  final String? avatarConfigId;
  final String avatarColor;
  final int currentLevel;
  final int totalXP;
  final int currentStreak;
  final int longestStreak;
  final DateTime? lastActivityDate;
  final ProgressStats progressStats;
  final AccessibilityPreferences? accessibilityPreferences;

  factory ChildProfile.fromJson(Map<String, dynamic> json) {
    final preferences = json['preferences'] as Map<String, dynamic>?;
    return ChildProfile(
      id: json['_id'] as String,
      familyId: json['familyId'] as String? ?? '',
      displayName: json['displayName'] as String,
      ageRange: json['ageRange'] as String,
      avatarConfigId: json['avatarConfigId'] as String?,
      avatarColor: json['avatarColor'] as String? ?? 'primary',
      currentLevel: (json['currentLevel'] as num?)?.toInt() ?? 1,
      totalXP: (json['totalXP'] as num?)?.toInt() ?? 0,
      currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
      lastActivityDate:
          json['lastActivityDate'] != null ? DateTime.tryParse(json['lastActivityDate'] as String) : null,
      progressStats: ProgressStats.fromJson(json['progressStats'] as Map<String, dynamic>?),
      accessibilityPreferences: preferences != null
          ? AccessibilityPreferences.fromJson(preferences['accessibilityPreferences'] as Map<String, dynamic>?)
          : null,
    );
  }
}
