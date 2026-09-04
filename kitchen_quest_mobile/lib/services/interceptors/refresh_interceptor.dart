import 'package:dio/dio.dart';
import '../secure_storage_service.dart';
import '../token_store.dart';

/// On a 401 from any endpoint other than /auth/*, attempts exactly one
/// silent token refresh (using a bare Dio instance with no interceptors,
/// to avoid recursing back into this same handler) and retries the
/// original request. If refresh fails, clears all tokens -- the app-level
/// router redirect (see routes/app_router.dart's refreshListenable) picks
/// that up and sends the user to the login screen.
///
/// Concurrent-refresh de-duplication mirrors the web client's
/// `refreshInFlight` promise: if five requests 401 at once, only one
/// refresh call goes out, and all five await its result.
class RefreshInterceptor extends Interceptor {
  RefreshInterceptor({
    required TokenStore tokenStore,
    required SecureStorageService secureStorage,
    required Dio retryDio,
    required String baseUrl,
  })  : _tokenStore = tokenStore,
        _secureStorage = secureStorage,
        _retryDio = retryDio,
        _refreshDio = Dio(BaseOptions(baseUrl: baseUrl));

  final TokenStore _tokenStore;
  final SecureStorageService _secureStorage;
  final Dio _retryDio; // the main client, used to replay the original request
  final Dio _refreshDio; // interceptor-free, used only for the refresh call itself

  Future<String?>? _refreshInFlight;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final path = err.requestOptions.path;
    final isAuthEndpoint = path.startsWith('/auth/');
    final isRetry = err.requestOptions.extra['isRetry'] == true;

    if (err.response?.statusCode != 401 || isAuthEndpoint || isRetry) {
      return handler.next(err);
    }

    final newAccessToken = await _refresh();
    if (newAccessToken == null) {
      _tokenStore.clear();
      await _secureStorage.clearRefreshToken();
      return handler.next(err);
    }

    try {
      final options = err.requestOptions;
      options.headers['Authorization'] = 'Bearer $newAccessToken';
      options.extra['isRetry'] = true;
      final response = await _retryDio.fetch(options);
      return handler.resolve(response);
    } on DioException catch (retryError) {
      return handler.next(retryError);
    }
  }

  Future<String?> _refresh() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() => _refreshInFlight = null);
  }

  Future<String?> _doRefresh() async {
    final refreshToken = await _secureStorage.readRefreshToken();
    if (refreshToken == null) return null;

    try {
      final response = await _refreshDio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final newAccessToken = data['accessToken'] as String;
      final newRefreshToken = data['refreshToken'] as String;

      _tokenStore.setAccessToken(newAccessToken);
      await _secureStorage.saveRefreshToken(newRefreshToken);
      return newAccessToken;
    } catch (_) {
      return null;
    }
  }
}
