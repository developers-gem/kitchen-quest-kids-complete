import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/models/parent_dashboard.dart';

void main() {
  group('DashboardOverview.fromJson', () {
    test('parses recent activity including a pending-verification entry', () {
      final overview = DashboardOverview.fromJson({
        'child': {'_id': 'child-1', 'displayName': 'Mia', 'avatarColor': 'primary', 'currentLevel': 2},
        'totalActivityCount': 10,
        'weeklyXpEarned': 40,
        'currentStreak': 3,
        'longestStreak': 5,
        'totalXP': 150,
        'recentActivity': [
          {'type': 'recipe', 'title': 'Mini Sliders', 'date': '2026-01-01T00:00:00.000Z', 'xpEarned': 0, 'pendingParentVerification': true},
        ],
      });

      expect(overview.childDisplayName, 'Mia');
      expect(overview.recentActivity, hasLength(1));
      expect(overview.recentActivity.first.pendingParentVerification, true);
      expect(overview.recentActivity.first.xpEarned, 0);
    });
  });

  group('ActivityHistoryPage.fromJson', () {
    test('merges games and recipes into one list, sorted newest-first', () {
      final page = ActivityHistoryPage.fromJson(
        {
          'data': {
            'games': [
              {'type': 'game', 'title': 'Older Game', 'date': '2026-01-01T00:00:00.000Z', 'xpEarned': 10},
            ],
            'recipes': [
              {'type': 'recipe', 'title': 'Newer Recipe', 'date': '2026-01-03T00:00:00.000Z', 'xpEarned': 40},
            ],
            'challenges': [],
            'achievements': [],
          },
        },
        {'page': 1, 'totalPages': 2},
      );

      expect(page.entries, hasLength(2));
      // Newest first, regardless of which source array it came from.
      expect(page.entries.first.title, 'Newer Recipe');
      expect(page.entries.last.title, 'Older Game');
      expect(page.page, 1);
      expect(page.totalPages, 2);
    });

    test('handles an empty history without throwing', () {
      final page = ActivityHistoryPage.fromJson(
        {
          'data': {'games': [], 'recipes': [], 'challenges': [], 'achievements': []},
        },
        {'page': 1, 'totalPages': 1},
      );

      expect(page.entries, isEmpty);
    });
  });

  group('GroceryOverviewCounts.fromJson', () {
    test('counts needed and checked items independently', () {
      final counts = GroceryOverviewCounts.fromJson({
        'needed': [
          {'_id': 'item-1'},
          {'_id': 'item-2'},
        ],
        'checked': [
          {'_id': 'item-3'},
        ],
        'customAdditions': [],
        'byRecipe': [],
      });

      expect(counts.neededCount, 2);
      expect(counts.checkedCount, 1);
    });
  });

  group('ParentSettings.fromJson', () {
    test('parses privacy and children fields from their nested locations', () {
      final settings = ParentSettings.fromJson({
        'notificationPreferences': [],
        'privacy': {'emailVerified': true, 'accountStatus': 'active', 'dataExportOrDeleteEndpoint': '/users/me'},
        'children': [
          {'_id': 'child-1', 'displayName': 'Mia'},
        ],
      });

      expect(settings.emailVerified, true);
      expect(settings.accountStatus, 'active');
      expect(settings.children, hasLength(1));
      expect(settings.children.first.displayName, 'Mia');
    });
  });
}
