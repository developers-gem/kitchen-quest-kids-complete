const { Router } = require("express");

const authRoutes = require("../../modules/auth/auth.routes");
const userRoutes = require("../../modules/users/user.routes");
const familyRoutes = require("../../modules/families/family.routes");
const childRoutes = require("../../modules/children/childProfile.routes");
const gameRoutes = require("../../modules/games/game.routes");
const recipeRoutes = require("../../modules/recipes/recipe.routes");
const groceryRoutes = require("../../modules/grocery/grocery.routes");
const avatarRoutes = require("../../modules/avatars/avatar.routes");
const dashboardRoutes = require("../../modules/parentDashboard/dashboard.routes");
const regionRoutes = require("../../modules/regions/region.routes");
const adminRoutes = require("../../modules/admin/admin.routes");
const dailyChallengeRoutes = require("../../modules/dailyChallenges/dailyChallenge.routes");
const achievementRoutes = require("../../modules/achievements/achievement.routes");
const nutritionLessonRoutes = require("../../modules/nutrition/nutritionLesson.routes");
const { healthCheckHandler } = require("../../utils/healthCheck");

const router = Router();

// Phase 1 modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/families", familyRoutes);
router.use("/children", childRoutes);
router.use("/avatars", avatarRoutes);

// Phase 2 modules
router.use("/games", gameRoutes);
router.use("/regions", regionRoutes);

// Phase 3 modules
router.use("/recipes", recipeRoutes);
router.use("/grocery", groceryRoutes);

// Phase 4 modules
router.use("/parent-dashboard", dashboardRoutes);

// Phase 5 modules -- admin & content management. Deliberately its own
// top-level path prefix (/admin/*), never overlapping with any
// child/parent-facing route, and gated by authorize(platform_admin)
// inside admin.routes.js itself.
router.use("/admin", adminRoutes);

// Phase 6 modules -- the gamification engine's child-facing surfaces
// (daily challenges, achievements). XP/streak/level/unlock logic itself
// has no dedicated routes -- it's threaded through the games/recipes
// completion endpoints via the central gamification engine
// (src/modules/gamification/), not exposed as its own API surface.
router.use("/daily-challenge", dailyChallengeRoutes);
router.use("/achievements", achievementRoutes);
router.use("/nutrition-lessons", nutritionLessonRoutes);

// Phases 7+ (notifications, analytics, ...) mount here in the same
// pattern once built.

router.get("/health", healthCheckHandler);

module.exports = router;
