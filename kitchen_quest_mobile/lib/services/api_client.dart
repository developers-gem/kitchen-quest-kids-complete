import 'package:dio/dio.dart';
import '../core/failures.dart';
import '../config/env.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/refresh_interceptor.dart';
import 'interceptors/retry_interceptor.dart';
import 'secure_storage_service.dart';
import 'token_store.dart';

/// The single Dio-backed client every repository (auth, children, games,
/// recipes, grocery, parent dashboard) goes through. Mirrors the web
/// app's api/client.ts one-to-one: same base URL contract, same envelope
/// parsing (`{ success, data, meta }` / `{ success: false, error }`), same
/// translation into one stable exception type instead of leaking a raw
/// HTTP client exception into every screen.
class ApiClient {
  ApiClient({required TokenStore tokenStore, required SecureStorageService secureStorage})
      : _dio = Dio(
          BaseOptions(
            baseUrl: Env.apiBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
          ),
        ) {
    _dio.interceptors.addAll([
      AuthInterceptor(tokenStore),
      RefreshInterceptor(
        tokenStore: tokenStore,
        secureStorage: secureStorage,
        retryDio: _dio,
        baseUrl: Env.apiBaseUrl,
      ),
      RetryInterceptor(_dio),
    ]);
  }

  final Dio _dio;

  /// Escape hatch for callers that need the raw Dio instance (none do
  /// today) -- kept private-ish by convention, not by language enforcement.
  Dio get rawClient => _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? query,
    bool skipGateToken = false,
  }) {
    return _request<T>(() => _dio.get(
          path,
          queryParameters: _cleanQuery(query),
          options: Options(extra: {'skipGateToken': skipGateToken}),
        ));
  }

  /// Like [get], but also returns `meta` (pagination info) from the
  /// envelope for list endpoints.
  Future<PaginatedResult<T>> getPaginated<T>(
    String path, {
    Map<String, dynamic>? query,
  }) {
    return _requestPaginated<T>(() => _dio.get(path, queryParameters: _cleanQuery(query)));
  }

  Future<T> post<T>(String path, {Object? body, bool skipGateToken = false}) {
    return _request<T>(() => _dio.post(
          path,
          data: body ?? <String, dynamic>{},
          options: Options(extra: {'skipGateToken': skipGateToken}),
        ));
  }

  Future<T> patch<T>(String path, {Object? body}) {
    return _request<T>(() => _dio.patch(path, data: body));
  }

  Future<T> delete<T>(String path) {
    return _request<T>(() => _dio.delete(path));
  }

  Map<String, dynamic>? _cleanQuery(Map<String, dynamic>? query) {
    if (query == null) return null;
    final cleaned = <String, dynamic>{};
    query.forEach((key, value) {
      if (value != null && value != '') cleaned[key] = value;
    });
    return cleaned;
  }

  Future<T> _request<T>(Future<Response<dynamic>> Function() call) async {
    final envelope = await _requestEnvelope(call);
    return envelope.data as T;
  }

  Future<PaginatedResult<T>> _requestPaginated<T>(Future<Response<dynamic>> Function() call) async {
    final envelope = await _requestEnvelope(call);
    final meta = envelope.meta ?? const {};
    return PaginatedResult<T>(
      data: envelope.data as T,
      page: (meta['page'] as num?)?.toInt() ?? 1,
      limit: (meta['limit'] as num?)?.toInt() ?? 0,
      total: (meta['total'] as num?)?.toInt() ?? 0,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  Future<_Envelope> _requestEnvelope(Future<Response<dynamic>> Function() call) async {
    try {
      final response = await call();
      final body = response.data as Map<String, dynamic>;
      if (body['success'] == true) {
        return _Envelope(data: body['data'], meta: body['meta'] as Map<String, dynamic>?);
      }
      throw _toApiFailure(response.statusCode ?? 500, body);
    } on DioException catch (err) {
      if (_isConnectivityError(err)) {
        throw const NetworkUnavailableFailure();
      }
      final body = err.response?.data;
      if (body is Map<String, dynamic>) {
        throw _toApiFailure(err.response?.statusCode ?? 500, body);
      }
      throw ApiFailure(
        statusCode: err.response?.statusCode ?? 500,
        code: 'UNKNOWN_ERROR',
        message: err.message ?? 'Something went wrong. Please try again.',
      );
    }
  }

  bool _isConnectivityError(DioException err) {
    return err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout;
  }

  ApiFailure _toApiFailure(int statusCode, Map<String, dynamic> body) {
    final error = body['error'] as Map<String, dynamic>? ?? const {};
    return ApiFailure(
      statusCode: statusCode,
      code: error['code'] as String? ?? 'UNKNOWN_ERROR',
      message: error['message'] as String? ?? 'Something went wrong. Please try again.',
      details: error['details'],
    );
  }
}

class _Envelope {
  _Envelope({required this.data, this.meta});
  final dynamic data;
  final Map<String, dynamic>? meta;
}

class PaginatedResult<T> {
  const PaginatedResult({
    required this.data,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final T data;
  final int page;
  final int limit;
  final int total;
  final int totalPages;
}
