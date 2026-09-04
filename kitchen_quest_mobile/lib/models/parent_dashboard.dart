/// Every model in this file was verified against
/// kitchen-quest-api/src/modules/parentDashboard/dashboard.service.js's
/// actual return shapes (the same verification already done for the web
/// client's types/api.ts), not re-derived independently a third time.

class RecentActivityEntry {
  const RecentActivityEntry({
    required this.type,
    required this.title,
    required this.date,
    required this.xpEarned,
    this.stars,
    this.pendingParentVerification,
  });

  final String type; // "game" | "recipe"
  final String title;
  final DateTime date;
  final int xpEarned;
  final int? stars;
  final bool? pendingParentVerification;

  factory RecentActivityEntry.fromJson(Map<String, dynamic> json) {
    return RecentActivityEntry(
      type: json['type'] as String,
      title: json['title'] as String,
      date: DateTime.parse(json['date'] as String),
      xpEarned: (json['xpEarned'] as num?)?.toInt() ?? 0,
      stars: (json['stars'] as num?)?.toInt(),
      pendingParentVerification: json['pendingParentVerification'] as bool?,
    );
  }
}

class DashboardOverview {
  const DashboardOverview({
    required this.childDisplayName,
    required this.totalActivityCount,
    required this.weeklyXpEarned,
    required this.currentStreak,
    required this.longestStreak,
    required this.totalXP,
    required this.recentActivity,
  });

  final String childDisplayName;
  final int totalActivityCount;
  final int weeklyXpEarned;
  final int currentStreak;
  final int longestStreak;
  final int totalXP;
  final List<RecentActivityEntry> recentActivity;

  factory DashboardOverview.fromJson(Map<String, dynamic> json) {
    final child = json['child'] as Map<String, dynamic>;
    return DashboardOverview(
      childDisplayName: child['displayName'] as String,
      totalActivityCount: (json['totalActivityCount'] as num?)?.toInt() ?? 0,
      weeklyXpEarned: (json['weeklyXpEarned'] as num?)?.toInt() ?? 0,
      currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
      totalXP: (json['totalXP'] as num?)?.toInt() ?? 0,
      recentActivity: (json['recentActivity'] as List<dynamic>? ?? const [])
          .map((e) => RecentActivityEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class WeeklySummary {
  const WeeklySummary({
    required this.gamesCompleted,
    required this.recipesCompleted,
    required this.foodsTried,
    required this.nutritionLessonsCompleted,
    required this.totalXPEarned,
    required this.currentStreak,
  });

  final int gamesCompleted;
  final int recipesCompleted;
  final int foodsTried;
  final int nutritionLessonsCompleted;
  final int totalXPEarned;
  final int currentStreak;

  factory WeeklySummary.fromJson(Map<String, dynamic> json) {
    return WeeklySummary(
      gamesCompleted: (json['gamesCompleted'] as num?)?.toInt() ?? 0,
      recipesCompleted: (json['recipesCompleted'] as num?)?.toInt() ?? 0,
      foodsTried: (json['foodsTried'] as num?)?.toInt() ?? 0,
      nutritionLessonsCompleted: (json['nutritionLessonsCompleted'] as num?)?.toInt() ?? 0,
      totalXPEarned: (json['totalXPEarned'] as num?)?.toInt() ?? 0,
      currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
    );
  }
}

class LearningProgress {
  const LearningProgress({
    required this.nutritionTopicsExplored,
    required this.cookingSkillsLearned,
    required this.foodsDiscovered,
    required this.regionsUnlocked,
  });

  final List<String> nutritionTopicsExplored;
  final List<String> cookingSkillsLearned;
  final List<String> foodsDiscovered;
  final List<String> regionsUnlocked;

  factory LearningProgress.fromJson(Map<String, dynamic> json) {
    return LearningProgress(
      nutritionTopicsExplored: (json['nutritionTopicsExplored'] as List<dynamic>? ?? const []).cast<String>(),
      cookingSkillsLearned: (json['cookingSkillsLearned'] as List<dynamic>? ?? const []).cast<String>(),
      foodsDiscovered: (json['foodsDiscovered'] as List<dynamic>? ?? const []).cast<String>(),
      regionsUnlocked: (json['regionsUnlocked'] as List<dynamic>? ?? const []).cast<String>(),
    );
  }
}

class ActivityHistoryPage {
  const ActivityHistoryPage({required this.entries, required this.page, required this.totalPages});

  final List<RecentActivityEntry> entries;
  final int page;
  final int totalPages;

  factory ActivityHistoryPage.fromJson(Map<String, dynamic> json, Map<String, dynamic> meta) {
    final data = json['data'] as Map<String, dynamic>;
    final games = (data['games'] as List<dynamic>? ?? const []).map((e) => RecentActivityEntry.fromJson(e as Map<String, dynamic>));
    final recipes = (data['recipes'] as List<dynamic>? ?? const []).map((e) => RecentActivityEntry.fromJson(e as Map<String, dynamic>));
    final entries = [...games, ...recipes]..sort((a, b) => b.date.compareTo(a.date));
    return ActivityHistoryPage(
      entries: entries,
      page: (meta['page'] as num?)?.toInt() ?? 1,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
    );
  }
}

class GroceryOverviewCounts {
  const GroceryOverviewCounts({required this.neededCount, required this.checkedCount});

  final int neededCount;
  final int checkedCount;

  factory GroceryOverviewCounts.fromJson(Map<String, dynamic> json) {
    return GroceryOverviewCounts(
      neededCount: (json['needed'] as List<dynamic>? ?? const []).length,
      checkedCount: (json['checked'] as List<dynamic>? ?? const []).length,
    );
  }
}

class ParentSettingsChild {
  const ParentSettingsChild({required this.id, required this.displayName});

  final String id;
  final String displayName;

  factory ParentSettingsChild.fromJson(Map<String, dynamic> json) {
    return ParentSettingsChild(id: json['_id'] as String, displayName: json['displayName'] as String);
  }
}

class ParentSettings {
  const ParentSettings({required this.emailVerified, required this.accountStatus, required this.children});

  final bool emailVerified;
  final String accountStatus;
  final List<ParentSettingsChild> children;

  factory ParentSettings.fromJson(Map<String, dynamic> json) {
    final privacy = json['privacy'] as Map<String, dynamic>;
    return ParentSettings(
      emailVerified: privacy['emailVerified'] as bool? ?? false,
      accountStatus: privacy['accountStatus'] as String? ?? 'active',
      children: (json['children'] as List<dynamic>? ?? const [])
          .map((e) => ParentSettingsChild.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
