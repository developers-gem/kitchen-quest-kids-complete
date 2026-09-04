/**
 * These types mirror the backend's Mongoose schemas and response shapes
 * directly (see kitchen-quest-api's models + services). They exist so the
 * frontend has compile-time confidence about API shapes -- NOT so the
 * frontend can re-derive or validate business rules. Any field here that
 * looks "computed" (xpEarned, stars, unlocked, ...) is always a value the
 * server already calculated; this file never encodes how to calculate it.
 */

export type AgeRange = "4-6" | "7-9" | "10-12";
export const AGE_RANGES: AgeRange[] = ["4-6", "7-9", "10-12"];
export type Difficulty = "easy" | "medium" | "hard";

// --- Auth / Users -----------------------------------------------------

export interface User {
  _id: string;
  role: string[];
  firstName?: string;
  lastName?: string;
  email: string;
  emailVerified: boolean;
  status: "active" | "suspended" | "deleted";
  timezone?: string;
  locale?: string;
  organizationId: string;
  notificationPreferences: NotificationPreference[];
}

export interface NotificationPreference {
  channel: "email" | "push" | "inApp";
  type: string;
  enabled: boolean;
}

export interface Organization {
  _id: string;
  type: "family" | "school";
  familyName?: string;
  primaryParent: string;
}

// --- Child profiles -----------------------------------------------------

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  largeText: boolean;
  audioNarration: boolean;
  captions: boolean;
}

export interface ChildProfile {
  _id: string;
  familyId: string;
  displayName: string;
  ageRange: AgeRange;
  avatarConfigId?: string;
  avatarColor: "primary" | "secondary" | "accent" | "neutral";
  currentLevel: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  progressStats: {
    gamesPlayed: number;
    gamesCompleted: number;
    recipesStarted: number;
    recipesCompleted: number;
    foodsTried: number;
    nutritionQuestsCompleted: number;
  };
  preferences?: {
    favoriteFoods?: string[];
    dislikedFoods?: string[];
    dietaryPreferences?: string[];
    accessibilityPreferences?: AccessibilityPreferences;
  };
}

export interface AvatarCharacter {
  _id: string;
  characterId: string;
  label: string;
  emoji?: string;
}

export interface AvatarCosmetic {
  _id: string;
  label: string;
  slot: "hat" | "accessory" | "background" | "colorVariant";
  assetKey: string;
  // Present only when the request included a childId -- see
  // avatar.service.js's listAvatarCatalog, which evaluates this via the
  // same shared unlockRuleEngine every other content type uses.
  unlocked?: boolean;
}

export interface AvatarCatalog {
  characters: AvatarCharacter[];
  colors: { id: string; label: string }[];
  // FIXED: this was missing entirely -- the backend has fully supported
  // avatar cosmetics (admin-authored, unlock-rule-gated) since an
  // earlier session, but neither this type nor AvatarSelector ever
  // consumed it, so no client rendered cosmetics or their locked state
  // anywhere despite the feature being complete server-side.
  cosmetics: AvatarCosmetic[];
}

// --- Games ---------------------------------------------------------------

export type GameType =
  | "quiz"
  | "matching"
  | "sorting"
  | "memory"
  | "sequence"
  | "dragAndDrop"
  | "maze"
  | "ingredientBuilder"
  | "timedChallenge";

export interface GameSummary {
  _id: string;
  title: string;
  slug: string;
  state?: string;
  gameType: GameType;
  ageGroups: AgeRange[];
  difficulty: Difficulty;
  description?: string;
  nutritionTopics: string[];
  foodTopics: string[];
  xpReward: number;
  maxStars: number;
  unlocked?: boolean;
  bestStars?: number;
}

export interface GameDetail extends Omit<GameSummary, "unlocked" | "bestStars"> {
  learningObjectives: string[];
  instructions?: string;
  unlocked?: boolean;
  bestStars?: number;
}

export interface StartGameSessionResponse {
  session: { _id: string; status: "inProgress"; startedAt: string };
  game: {
    _id: string;
    title: string;
    gameType: GameType;
    maxStars: number;
    instructions?: string;
    assetConfig?: unknown;
    /** Redacted -- never includes the answer key. Shape depends on gameType. */
    configuration: Record<string, unknown>;
  };
}

export interface CompleteGameSessionResponse {
  session: {
    _id: string;
    status: "completed";
    score: number;
    scoreTotal: number;
    stars: number;
    xpEarned: number;
    completionRank: number;
    isFirstCompletion: boolean;
    dailyCapReached: boolean;
  };
  child: {
    totalXP: number;
    currentLevel: number;
    currentStreak: number;
    streakIncreased: boolean;
  };
  // FIXED: this type was missing two fields the backend's
  // completeSession actually returns (game.service.js) -- caught while
  // building the results screen that needed them, not by a separate
  // audit pass. newlyEarnedAchievements is intentionally a minimal shape
  // (not the full Achievement type) since that's all a completion
  // celebration screen needs; dailyChallenge mirrors
  // dailyChallenge.service.js's recordChallengeProgress return shape.
  // Verified against achievementEngine.service.js's actual return shape
  // -- includes more fields than the results screen currently uses
  // (description, category, rarity), kept here for completeness so a
  // future achievement-detail UI doesn't need another type fix.
  newlyEarnedAchievements: {
    _id: string;
    title: string;
    description: string;
    icon?: string;
    category: string;
    rarity: string;
    xpReward: number;
  }[];
  // Mirrors dailyChallenge.service.js's recordChallengeProgress return
  // shape exactly (verified against source, not guessed): `matched` is
  // false whenever no challenge is scheduled today or this event type
  // doesn't count toward it -- not an error, just "not applicable."
  dailyChallenge: { matched: boolean; justCompleted: boolean; xpAwarded: number };
}

// --- Recipes ---------------------------------------------------------------

export interface IngredientLine {
  name: string;
  quantity?: number;
  unit?: string;
  category: string;
  optional?: boolean;
  substitutes?: string[];
}

export interface ChildModeIngredient {
  name: string;
  category: string;
}

export interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  simpleInstruction?: string;
  image?: string;
  video?: string;
  audioNarration?: string;
  safetyLevel: "none" | "lowHeat" | "highHeat" | "sharpTool";
  parentAssistanceRequired?: boolean;
}

export interface RecipeSummary {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  coverImage?: string;
  difficulty: Difficulty;
  preparationTimeMinutes?: number;
  cookingTimeMinutes?: number;
  totalTimeMinutes: number;
  stepCount: number;
  ageGroups: AgeRange[];
  allergenInformation: string[];
  xpReward: number;
  unlocked?: boolean;
  timesCompleted?: number;
}

export interface RecipeDetailParentMode extends RecipeSummary {
  description: string;
  gallery: string[];
  cuisine?: string;
  nutritionLearning: string[];
  learningObjectives: string[];
  ingredients: IngredientLine[];
  steps: RecipeStep[];
  supervisionRequired: boolean;
  knifeSafety: boolean;
  heatSafety: boolean;
  requiresParentVerification: boolean;
  cookingSkills: string[];
  funFacts: string[];
}

export interface RecipeDetailChildMode {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  gallery: string[];
  difficulty: Difficulty;
  totalTimeMinutes: number;
  stepCount: number;
  ageGroups: AgeRange[];
  cookingSkills: string[];
  funFacts: string[];
  xpReward: number;
  ingredients: ChildModeIngredient[];
  needsGrownUpHelp: boolean;
  unlocked?: boolean;
}

export interface CurrentStepView {
  stepNumber: number;
  totalSteps: number;
  title: string;
  instruction: string;
  image?: string;
  video?: string;
  audioNarration?: string;
  needsGrownUp: boolean;
}

export interface RecipeProgressState {
  _id: string;
  status: "inProgress" | "paused" | "completed" | "abandoned";
  currentStepIndex: number;
}

export interface StartCookingResponse {
  progress: RecipeProgressState;
  recipe: RecipeDetailChildMode;
  // FIXED: matches the backend fix for the "re-open after finishing all
  // steps without completing" edge case -- currentStep can now be null
  // (with readyToComplete true) instead of the backend crashing on an
  // out-of-bounds step access.
  currentStep: CurrentStepView | null;
  readyToComplete: boolean;
}

export interface StepProgressResponse {
  progress: RecipeProgressState;
  currentStep: CurrentStepView | null;
  readyToComplete: boolean;
}

export interface CompleteCookingResponse {
  progress: {
    _id: string;
    status: "completed";
    xpEarned: number;
    isFirstCompletion: boolean;
    pendingParentVerification: boolean;
  };
  // FIXED (same class of gap as CompleteGameSessionResponse): verified
  // against recipe.service.js's actual completeCooking return shape
  // rather than assumed -- these were missing entirely.
  newlyEarnedAchievements: {
    _id: string;
    title: string;
    description: string;
    icon?: string;
    category: string;
    rarity: string;
    xpReward: number;
  }[];
  dailyChallenge: { matched: boolean; justCompleted: boolean; xpAwarded: number };
}

export interface VerifyCookingResponse {
  progress: { _id: string; parentVerified: true; xpEarned: number };
  newlyEarnedAchievements: {
    _id: string;
    title: string;
    description: string;
    icon?: string;
    category: string;
    rarity: string;
    xpReward: number;
  }[];
}

// --- Grocery ---------------------------------------------------------------

export interface GroceryItem {
  _id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category: string;
  checked: boolean;
  custom: boolean;
  sourceRecipes: string[];
}

export interface GroceryList {
  _id: string;
  family: string;
  items: GroceryItem[];
  status: "active" | "archived";
}

// --- Parent dashboard --------------------------------------------------

export interface DashboardOverview {
  child: { _id: string; displayName: string; avatarColor: string; currentLevel: number };
  totalActivityCount: number;
  weeklyXpEarned: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  recentActivity: {
    type: "game" | "recipe";
    title: string;
    date: string;
    xpEarned: number;
    stars?: number;
    pendingParentVerification?: boolean;
  }[];
}

export interface WeeklySummary {
  weekRange: { start: string; end: string };
  gamesCompleted: number;
  recipesCompleted: number;
  foodsTried: number;
  nutritionLessonsCompleted: number;
  totalXPEarned: number;
  currentStreak: number;
}

export interface LearningProgress {
  nutritionTopicsExplored: string[];
  cookingSkillsLearned: string[];
  foodsDiscovered: string[];
  regionsUnlocked: string[];
}

export interface ActivityHistoryEntry {
  type: "game" | "recipe";
  title: string;
  date: string;
  xpEarned: number;
  stars?: number;
  pendingParentVerification?: boolean;
}

export interface ActivityHistoryResponse {
  data: {
    games: ActivityHistoryEntry[];
    recipes: ActivityHistoryEntry[];
    challenges: unknown[];
    achievements: unknown[];
  };
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface GroceryOverview {
  needed: GroceryItem[];
  checked: GroceryItem[];
  customAdditions: GroceryItem[];
  byRecipe: { recipeId: string; ingredientNames: string[] }[];
}

export interface ParentSettings {
  notificationPreferences: NotificationPreference[];
  privacy: { emailVerified: boolean; accountStatus: string; dataExportOrDeleteEndpoint: string };
  children: { _id: string; displayName: string; accessibilityPreferences?: AccessibilityPreferences }[];
}

// --- Regions -------------------------------------------------------------

export interface Region {
  _id: string;
  name: string;
  slug: string;
  scopeType: "usState" | "usRegion" | "country";
  state?: string;
  unlockOrder: number;
  // FIXED: this used to be `active: boolean`, left over from before the
  // backend migrated Region from an ad-hoc active flag to the same
  // draft/review/published/archived workflow every other content type
  // uses (see kitchen-quest-api's Region model). The child-facing
  // /api/v1/regions response never actually included `active` -- it was
  // stale, unused dead code just waiting to confuse whoever built the
  // Flavor Hub against it. `gameCount` is the field the backend actually
  // returns, listed here for the first time.
  gameCount: number;
  unlocked?: boolean;
}

// --- Shared envelope -------------------------------------------------------

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number } | Record<string, unknown>;
  message?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
