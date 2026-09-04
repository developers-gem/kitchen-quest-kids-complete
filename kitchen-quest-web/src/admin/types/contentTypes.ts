import type { AgeRange, Difficulty, GameType, IngredientLine, RecipeStep } from "../../types/api";
import type { AuditFields } from "./adminContent";

export interface AdminGame extends AuditFields {
  _id: string;
  title: string;
  slug: string;
  region?: string;
  state?: string;
  gameType: GameType;
  ageGroups: AgeRange[];
  difficulty: Difficulty;
  description?: string;
  learningObjectives: string[];
  nutritionTopics: string[];
  foodTopics: string[];
  instructions?: string;
  assetConfig?: Record<string, unknown>;
  configuration: Record<string, unknown>;
  xpReward: number;
  maxStars: number;
  unlockRequirements?: Record<string, unknown>;
}

export interface AdminRecipe extends AuditFields {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  coverImage?: string;
  gallery: string[];
  cuisine?: string;
  region?: string;
  ageGroups: AgeRange[];
  difficulty: "easy" | "medium";
  preparationTimeMinutes: number;
  cookingTimeMinutes: number;
  totalTimeMinutes: number;
  ingredients: IngredientLine[];
  steps: RecipeStep[];
  cookingSkills: string[];
  nutritionLearning: string[];
  funFacts: string[];
  learningObjectives: string[];
  xpReward: number;
  unlockRequirements?: Record<string, unknown>;
  supervisionRequired: boolean;
  knifeSafety: boolean;
  heatSafety: boolean;
  allergenInformation: string[];
  requiresParentVerification: boolean;
}

export interface AdminRegion extends AuditFields {
  _id: string;
  name: string;
  slug: string;
  scopeType: "usState" | "usRegion" | "country";
  state?: string;
  locationDescription?: string;
  featuredFoods: string[];
  image?: string;
  unlockOrder: number;
  unlockRequirements?: Record<string, unknown>;
}

type ContentStatusLike = "draft" | "review" | "published" | "archived";

export interface RegionAssignedContent {
  games: { _id: string; title: string; slug: string; status: ContentStatusLike; gameType: string }[];
  recipes: { _id: string; title: string; slug: string; status: ContentStatusLike; difficulty: string }[];
}

export interface AdminNutritionLesson extends AuditFields {
  _id: string;
  title: string;
  slug: string;
  ageGroups: AgeRange[];
  topic: string;
  content: string;
  media: string[];
  learningObjectives: string[];
  quiz?: Record<string, unknown>;
  xpReward: number;
  region?: string;
}

export interface AdminFoodFact extends AuditFields {
  _id: string;
  foodName: string;
  fact: string;
  ageGroups: AgeRange[];
  topic?: string;
  image?: string;
}

export interface AdminAchievement extends AuditFields {
  _id: string;
  title: string;
  description: string;
  icon?: string;
  category: "exploration" | "cooking" | "nutrition" | "streak" | "social" | "mastery";
  unlockCriteria: { type: string } & Record<string, unknown>;
  xpReward: number;
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

// FIXED (gap investigation): AdminDailyChallenge and AdminAvatarCosmetic
// were the two content types with a complete, tested backend admin
// module (see admin.routes.js's "/daily-challenges" and
// "/avatar-cosmetics" mounts) but no frontend admin page at all --
// meaning nobody could actually author either kind of content through
// the app. Verified against dailyChallenge.model.js and
// avatarCosmetic.model.js directly rather than guessed.
export interface AdminDailyChallenge extends AuditFields {
  _id: string;
  title: string;
  description?: string;
  challengeType: "completeAnyGame" | "completeSpecificGame" | "completeAnyRecipe" | "completeSpecificRecipe";
  // Shape depends on challengeType, matching the backend's own Mixed
  // field exactly: { count } for the "any" types, { gameId, count } or
  // { recipeId, count } for the "specific" types.
  target: { count: number; gameId?: string; recipeId?: string };
  xpReward: number;
  dateRange: { startDate: string; endDate: string };
  applicableAgeGroups: AgeRange[];
}

export interface AdminAvatarCosmetic extends AuditFields {
  _id: string;
  label: string;
  slot: "hat" | "accessory" | "background" | "colorVariant";
  assetKey: string;
  unlockRequirements: { type: string } & Record<string, unknown>;
}

export interface AdminDashboardOverview {
  totalUsers: number;
  totalFamilies: number;
  totalChildProfiles: number;
  activeUsers: {
    childProfilesActiveLast7Days: number;
    parentAccountsActiveLast30Days: number;
  };
  gamesCompletedTotal: number;
  recipesCompletedTotal: number;
  popularContent: {
    topGames: { _id: string; title: string; gameType: string; completions: number }[];
    topRecipes: { _id: string; title: string; completions: number }[];
  };
}
