const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const { ROLES } = require("../../config/constants");

const dashboardRoutes = require("./dashboard/adminDashboard.routes");
const gamesRoutes = require("./games/adminGames.routes");
const recipesRoutes = require("./recipes/adminRecipes.routes");
const regionsRoutes = require("./regions/adminRegions.routes");
const nutritionRoutes = require("./nutrition/adminNutrition.routes");
const achievementsRoutes = require("./achievements/adminAchievements.routes");
const avatarCosmeticsRoutes = require("./avatarCosmetics/adminAvatarCosmetics.routes");
const dailyChallengesRoutes = require("./dailyChallenges/adminDailyChallenges.routes");

/**
 * Everything under /api/v1/admin/* requires authentication AND the
 * platform_admin role -- applied once, here, rather than per sub-router,
 * so there is exactly one place that decides "who is allowed into the
 * admin surface at all." This is also the concrete implementation of
 * "keep admin functionality separated from the child-facing experience":
 * no admin route shares a path prefix with any child/parent-facing route
 * (/games vs /admin/games, /recipes vs /admin/recipes, etc.), so the two
 * surfaces can be reasoned about, rate-limited, and deployed independently
 * if that's ever useful, and a bug in one route table can't accidentally
 * expose the other.
 */
const router = Router();

router.use(authenticate());
router.use(authorize(ROLES.PLATFORM_ADMIN));

router.use("/dashboard", dashboardRoutes);
router.use("/games", gamesRoutes);
router.use("/recipes", recipesRoutes);
router.use("/regions", regionsRoutes);
router.use("/nutrition", nutritionRoutes);
router.use("/achievements", achievementsRoutes);
router.use("/avatar-cosmetics", avatarCosmeticsRoutes);
router.use("/daily-challenges", dailyChallengesRoutes);

module.exports = router;
