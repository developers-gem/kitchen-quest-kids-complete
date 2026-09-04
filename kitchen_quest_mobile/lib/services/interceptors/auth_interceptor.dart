import 'package:dio/dio.dart';
import '../token_store.dart';

/// Attaches `Authorization: Bearer <token>` and, when present,
/// `x-parental-gate-token` to every outgoing request. Set
/// `options.extra['skipGateToken'] = true` on a request that must never
/// send the gate header even if one happens to be set (mirrors the web
/// client's `skipGateToken` option -- no endpoint needs this today, but
/// the escape hatch exists for the same reason it does there).
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._tokenStore);

  final TokenStore _tokenStore;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final accessToken = _tokenStore.accessToken;
    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }

    final skipGate = options.extra['skipGateToken'] == true;
    final gateToken = skipGate ? null : _tokenStore.gateToken;
    if (gateToken != null) {
      options.headers['x-parental-gate-token'] = gateToken;
    }

    handler.next(options);
  }
}
