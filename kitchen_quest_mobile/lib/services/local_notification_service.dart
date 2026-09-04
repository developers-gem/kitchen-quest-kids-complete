import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// On-device notifications the app schedules itself (no server round
/// trip needed) -- primarily streak-at-risk reminders ("play a quick game
/// today to keep your streak!"), scheduled locally based on the child's
/// `lastActivityDate` already present in ChildProfile. This is distinct
/// from [PushNotificationService], which handles server-sent pushes for
/// things that require backend knowledge (a parent verifying a recipe
/// from another device, a weekly digest, etc.) -- see that file's doc
/// comment for the split rationale.
class LocalNotificationService {
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false, // permission requested explicitly, see requestPermission()
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final iosPlugin = _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();

    final androidGranted = await androidPlugin?.requestNotificationsPermission() ?? true;
    final iosGranted = await iosPlugin?.requestPermissions(alert: true, badge: true, sound: true) ?? true;
    return androidGranted && iosGranted;
  }

  Future<void> showStreakReminder({required String childDisplayName, required int currentStreak}) async {
    await _plugin.show(
      _streakReminderNotificationId,
      "Don't lose your streak!",
      '$childDisplayName has a $currentStreak-day streak going. Play a quick game today!',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'streak_reminders',
          'Streak reminders',
          channelDescription: 'Reminders to keep your cooking streak going',
          importance: Importance.defaultImportance,
        ),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }

  Future<void> cancelStreakReminder() => _plugin.cancel(_streakReminderNotificationId);

  static const _streakReminderNotificationId = 1001;
}
