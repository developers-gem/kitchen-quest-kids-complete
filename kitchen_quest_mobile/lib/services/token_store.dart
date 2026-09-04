/// Plain (non-Riverpod) holder for the current access token and parental
/// gate token, read synchronously by Dio interceptors on every request.
/// Exposed to the rest of the app through `tokenStoreProvider` (see
/// shared/providers/core_providers.dart) so screens interact with it
/// through Riverpod like everything else, but the interceptor itself
/// doesn't need a BuildContext/WidgetRef to read it -- exactly the same
/// reasoning as the web app's tokenStore.ts module.
class TokenStore {
  String? _accessToken;
  String? _gateToken;
  DateTime? _gateTokenExpiresAt;

  static const _gateTokenTtl = Duration(minutes: 14); // just under the backend's 15m

  String? get accessToken => _accessToken;

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  String? get gateToken {
    if (_gateTokenExpiresAt != null && DateTime.now().isAfter(_gateTokenExpiresAt!)) {
      _gateToken = null;
      _gateTokenExpiresAt = null;
    }
    return _gateToken;
  }

  void setGateToken(String? token) {
    _gateToken = token;
    _gateTokenExpiresAt = token != null ? DateTime.now().add(_gateTokenTtl) : null;
  }

  void clear() {
    _accessToken = null;
    _gateToken = null;
    _gateTokenExpiresAt = null;
  }
}
