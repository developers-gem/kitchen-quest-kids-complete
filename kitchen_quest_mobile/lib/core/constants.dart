/// Mirrors kitchen-quest-api's src/config/constants.js. Kept as plain
/// constants (not an enum tied to backend internals) so a new age range
/// or role added server-side doesn't require touching business logic
/// here -- these are used for display/validation hints only, since the
/// backend is the actual source of truth and re-validates everything.
class AgeRanges {
  static const List<String> all = ['4-6', '7-9', '10-12'];
}

class ChildAvatarColors {
  static const List<String> all = ['primary', 'secondary', 'accent', 'neutral'];
}

class ApiErrorCodes {
  static const validationError = 'VALIDATION_ERROR';
  static const unauthenticated = 'UNAUTHENTICATED';
  static const forbidden = 'FORBIDDEN';
  static const notFound = 'NOT_FOUND';
  static const conflict = 'CONFLICT';
  static const rateLimited = 'RATE_LIMITED';
  static const parentalGateRequired = 'PARENTAL_GATE_REQUIRED';
  static const gameLocked = 'GAME_LOCKED';
  static const recipeLocked = 'RECIPE_LOCKED';
  static const internalError = 'INTERNAL_ERROR';
}
