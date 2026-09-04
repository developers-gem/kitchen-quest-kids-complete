/// Every repository throws this (never a raw DioException) so UI code has
/// exactly one exception type to catch, with a stable `.code` to branch on
/// -- mirrors the web app's ApiError class exactly, since both clients
/// parse the identical backend error envelope
/// (`{ success: false, error: { code, message } }`).
class ApiFailure implements Exception {
  final int statusCode;
  final String code;
  final String message;
  final Object? details;

  const ApiFailure({
    required this.statusCode,
    required this.code,
    required this.message,
    this.details,
  });

  /// True for the specific case a screen should react to by showing the
  /// parental gate again rather than a generic error banner.
  bool get requiresParentalGate => code == 'PARENTAL_GATE_REQUIRED';

  @override
  String toString() => 'ApiFailure($code): $message';
}

/// Thrown by repositories/services when there's no network path at all --
/// distinct from ApiFailure (which means "the server answered, and said
/// no") so offline-aware screens (the grocery checklist especially) can
/// branch on "can't reach the server" vs. "server rejected this."
class NetworkUnavailableFailure implements Exception {
  const NetworkUnavailableFailure();

  @override
  String toString() => 'NetworkUnavailableFailure';
}
