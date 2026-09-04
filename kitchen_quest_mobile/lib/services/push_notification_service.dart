import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api_client.dart';

/// =============================================================================
/// ARCHITECTURE NOTE -- read before wiring this into a real build:
/// =============================================================================
/// This class is the *architecture* for push notifications: token
/// acquisition, registering that token with the backend, and routing an
/// incoming message to the right screen. It is NOT fully wired end-to-end,
/// for one honest reason: Firebase Cloud Messaging requires a real
/// Firebase project (via `flutterfire configure`, which generates
/// `firebase_options.dart` and platform config files --
/// `google-services.json` for Android, `GoogleService-Info.plist` for
/// iOS -- tied to an actual project's credentials). Fabricating those
/// files with placeholder values would look configured while silently
/// failing at runtime, which is worse than being explicit that this step
/// is outstanding.
///
/// What IS real here: the registration-token flow, the backend endpoint
/// contract it expects (`POST /users/me/push-tokens` -- not yet built on
/// the backend either; the Notification module as a whole is a later
/// phase per the architecture doc's roadmap), and the message-routing
/// shape. Once a real Firebase project exists, `Firebase.initializeApp()`
/// needs the generated `firebase_options.dart`, and this service's
/// `registerToken` call needs that backend endpoint to exist.
/// =============================================================================
class PushNotificationService {
  PushNotificationService(this._apiClient);

  final ApiClient _apiClient;
  final _messaging = FirebaseMessaging.instance;

  final _messageController = StreamController<PushMessage>.broadcast();

  /// Screens (e.g. the app root) listen here to react to a push -- e.g.
  /// navigating to a specific recipe's verification screen when a parent
  /// gets "Mia finished cooking Rainbow Street Tacos!"
  Stream<PushMessage> get onMessage => _messageController.stream;

  Future<bool> requestPermission() async {
    final settings = await _messaging.requestPermission(alert: true, badge: true, sound: true);
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// Registers this device's FCM token with the backend so it can target
  /// pushes at this specific device. Also re-registers on token refresh
  /// (FCM tokens rotate periodically) and should be called again after
  /// every successful login, since a token registered under one parent
  /// account is meaningless after switching accounts on a shared device.
  Future<void> registerToken() async {
    final token = await _messaging.getToken();
    if (token == null) return;
    await _sendTokenToBackend(token);

    _messaging.onTokenRefresh.listen(_sendTokenToBackend);
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      // Endpoint contract only -- not implemented on the backend yet (the
      // Notification module is a future phase). Calling this today would
      // 404; left in place so the client-side contract is explicit and
      // this becomes a one-line real call once that endpoint exists.
      await _apiClient.post<dynamic>('/users/me/push-tokens', body: {
        'token': token,
        'platform': _currentPlatformLabel,
      });
    } catch (_) {
      // Non-fatal -- push registration failing shouldn't block app usage.
    }
  }

  String get _currentPlatformLabel {
    // Kept trivial and dependency-free; a real implementation would use
    // Platform.isIOS / Platform.isAndroid from dart:io.
    return 'mobile';
  }

  void listenForMessages() {
    FirebaseMessaging.onMessage.listen(_handleMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessage);
  }

  void _handleMessage(RemoteMessage message) {
    _messageController.add(
      PushMessage(
        title: message.notification?.title,
        body: message.notification?.body,
        data: message.data,
      ),
    );
  }

  void dispose() {
    _messageController.close();
  }
}

class PushMessage {
  const PushMessage({this.title, this.body, this.data = const {}});

  final String? title;
  final String? body;
  final Map<String, dynamic> data;
}
