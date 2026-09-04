class Env {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
     defaultValue: 'http://10.0.2.2:4000/api/v1',
  );

  static const bool isProduction = bool.fromEnvironment('dart.vm.product');
}
