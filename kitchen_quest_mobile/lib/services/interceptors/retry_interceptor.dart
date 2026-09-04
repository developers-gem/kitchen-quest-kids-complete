import 'dart:async';
import 'package:dio/dio.dart';

/// Retry strategy: ONLY for GET requests (idempotent -- safe to repeat)
/// that fail due to a transient network condition (timeout, connection
/// error) -- never for POST/PATCH/DELETE, since blindly retrying a
/// "complete this game" or "create this child" call could double-submit
/// something the server would otherwise correctly treat as a new action.
/// Up to 2 retries with linear backoff (500ms, 1000ms) before giving up
/// and surfacing NetworkUnavailableFailure to the caller.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio);

  final Dio _dio;

  static const _maxRetries = 2;

  bool _isTransientNetworkError(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.connectionError;
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final isGet = err.requestOptions.method.toUpperCase() == 'GET';
    final attempt = (err.requestOptions.extra['retryAttempt'] as int?) ?? 0;

    final shouldRetry = isGet && attempt < _maxRetries && _isTransientNetworkError(err);

    if (!shouldRetry) {
      return handler.next(err);
    }

    final delay = Duration(milliseconds: 500 * (attempt + 1));
    await Future.delayed(delay);

    try {
      final options = err.requestOptions;
      options.extra['retryAttempt'] = attempt + 1;
      final response = await _dio.fetch(options);
      return handler.resolve(response);
    } on DioException catch (retryError) {
      return handler.next(retryError);
    }
  }
}
