import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_quest_mobile/services/token_store.dart';

/// TokenStore is what AuthInterceptor reads on every single API request
/// (see services/interceptors/auth_interceptor.dart) -- correctness here
/// underpins every authenticated call the app makes, not just auth
/// screens specifically.
void main() {
  late TokenStore store;

  setUp(() {
    store = TokenStore();
  });

  group('Access token', () {
    test('starts as null before anything is set', () {
      expect(store.accessToken, isNull);
    });

    test('reflects the most recently set value', () {
      store.setAccessToken('token-a');
      expect(store.accessToken, 'token-a');
      store.setAccessToken('token-b');
      expect(store.accessToken, 'token-b');
    });

    test('can be cleared back to null', () {
      store.setAccessToken('token-a');
      store.setAccessToken(null);
      expect(store.accessToken, isNull);
    });
  });

  group('Parental gate token', () {
    test('starts as null', () {
      expect(store.gateToken, isNull);
    });

    test('is readable immediately after being set', () {
      store.setGateToken('gate-token-1');
      expect(store.gateToken, 'gate-token-1');
    });

    // NOTE ON WHAT ISN'T TESTED HERE: the gate token's ~14-minute TTL
    // expiry can't be exercised in a plain unit test without either
    // waiting 14 real minutes or making TokenStore's clock injectable
    // (it currently calls DateTime.now() directly, not via an injected
    // Clock). That's a legitimate small refactor for a follow-up if
    // TTL-boundary testing becomes important -- flagged here rather than
    // writing a test that either takes 14 minutes to run or silently
    // doesn't actually test the expiry path it claims to.

    test('clear() removes the gate token immediately', () {
      store.setGateToken('gate-token-1');
      store.clear();
      expect(store.gateToken, isNull);
    });
  });

  group('clear()', () {
    test('resets both the access token and the gate token together', () {
      store.setAccessToken('token-a');
      store.setGateToken('gate-token-1');

      store.clear();

      expect(store.accessToken, isNull);
      expect(store.gateToken, isNull);
    });
  });
}
