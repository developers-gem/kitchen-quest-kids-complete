class NotificationPreference {
  const NotificationPreference({required this.channel, required this.type, required this.enabled});

  final String channel;
  final String type;
  final bool enabled;

  factory NotificationPreference.fromJson(Map<String, dynamic> json) {
    return NotificationPreference(
      channel: json['channel'] as String,
      type: json['type'] as String,
      enabled: json['enabled'] as bool,
    );
  }

  Map<String, dynamic> toJson() => {'channel': channel, 'type': type, 'enabled': enabled};
}

/// Mirrors kitchen-quest-api's User model / the web app's `User` type
/// exactly -- same fields, same optionality.
class User {
  const User({
    required this.id,
    required this.roles,
    this.firstName,
    this.lastName,
    required this.email,
    required this.emailVerified,
    required this.status,
    this.timezone,
    this.locale,
    required this.organizationId,
    required this.notificationPreferences,
  });

  final String id;
  final List<String> roles;
  final String? firstName;
  final String? lastName;
  final String email;
  final bool emailVerified;
  final String status;
  final String? timezone;
  final String? locale;
  final String organizationId;
  final List<NotificationPreference> notificationPreferences;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] as String,
      roles: (json['role'] as List<dynamic>? ?? const []).cast<String>(),
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      email: json['email'] as String,
      emailVerified: json['emailVerified'] as bool? ?? false,
      status: json['status'] as String? ?? 'active',
      timezone: json['timezone'] as String?,
      locale: json['locale'] as String?,
      organizationId: json['organizationId'] as String,
      notificationPreferences: (json['notificationPreferences'] as List<dynamic>? ?? const [])
          .map((e) => NotificationPreference.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
