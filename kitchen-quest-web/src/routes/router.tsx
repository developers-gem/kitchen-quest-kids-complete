// import { createBrowserRouter, Navigate } from "react-router-dom";
// import { AppLayout } from "../components/AppLayout";
// import { RequireAuth } from "./RequireAuth";
// import { LoginPage } from "../pages/auth/LoginPage";
// import { RegisterPage } from "../pages/auth/RegisterPage";
// import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
// import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
// import { VerifyEmailPage } from "../pages/auth/VerifyEmailPage";
// import { HomeDashboardPage } from "../pages/dashboard/HomeDashboardPage";
// import { ParentDashboardPage } from "../pages/parent/ParentDashboardPage";
// import { ManageChildrenPage } from "../pages/parent/ManageChildrenPage";
// import { FlavorHubPage } from "../pages/flavorHub/FlavorHubPage";
// import { RegionDetailPage } from "../pages/flavorHub/RegionDetailPage";
// import { GamesListPage } from "../pages/games/GamesListPage";
// import { GamePlayPage } from "../pages/games/GamePlayPage";
// import { RecipesListPage } from "../pages/recipes/RecipesListPage";
// import { RecipeDetailPage } from "../pages/recipes/RecipeDetailPage";
// import { CookingModePage } from "../pages/recipes/CookingModePage";
// import { GroceryListPage } from "../pages/grocery/GroceryListPage";
// import { AdminGuard } from "../admin/components/AdminGuard";
// import { AdminLayout } from "../admin/components/AdminLayout";
// import { AdminDashboardPage } from "../admin/pages/AdminDashboardPage";
// import { AdminGamesListPage } from "../admin/pages/games/AdminGamesListPage";
// import { AdminGameEditorPage } from "../admin/pages/games/AdminGameEditorPage";
// import { AdminRecipesListPage } from "../admin/pages/recipes/AdminRecipesListPage";
// import { AdminRecipeEditorPage } from "../admin/pages/recipes/AdminRecipeEditorPage";
// import { AdminRegionsListPage } from "../admin/pages/regions/AdminRegionsListPage";
// import { AdminRegionEditorPage } from "../admin/pages/regions/AdminRegionEditorPage";
// import { AdminNutritionLessonsListPage } from "../admin/pages/nutrition/AdminNutritionLessonsListPage";
// import { AdminNutritionLessonEditorPage } from "../admin/pages/nutrition/AdminNutritionLessonEditorPage";
// import { AdminFoodFactsListPage } from "../admin/pages/nutrition/AdminFoodFactsListPage";
// import { AdminFoodFactEditorPage } from "../admin/pages/nutrition/AdminFoodFactEditorPage";
// import { AdminAchievementsListPage } from "../admin/pages/achievements/AdminAchievementsListPage";
// import { AdminAchievementEditorPage } from "../admin/pages/achievements/AdminAchievementEditorPage";
// import { AdminDailyChallengesListPage } from "../admin/pages/dailyChallenges/AdminDailyChallengesListPage";
// import { AdminDailyChallengeEditorPage } from "../admin/pages/dailyChallenges/AdminDailyChallengeEditorPage";
// import { AdminAvatarCosmeticsListPage } from "../admin/pages/avatarCosmetics/AdminAvatarCosmeticsListPage";
// import { AdminAvatarCosmeticEditorPage } from "../admin/pages/avatarCosmetics/AdminAvatarCosmeticEditorPage";

// /**
//  * Route structure:
//  *  /login, /register, /forgot-password, /reset-password, /verify-email  -- public
//  *  /admin/*                                                -- behind RequireAuth AND AdminGuard
//  *                                                             (platform_admin role), rendered
//  *                                                             inside the separate AdminLayout shell
//  *  everything else                                        -- behind RequireAuth,
//  *                                                             rendered inside AppLayout
//  *
//  * The admin tree is nested under its own AdminGuard + AdminLayout rather
//  * than reusing AppLayout -- this is the routing half of "keep admin
//  * functionality separated from the child-facing experience" (the other
//  * half is server-side: every /api/v1/admin/* call requires the
//  * platform_admin role regardless of what this router does).
//  *
//  * MILESTONE: every child/parent-facing route that used to be a
//  * ComingSoonPage placeholder (Flavor Hub, Games, Recipes, Grocery, the
//  * full Parent Dashboard) is now a real, tested page against backend
//  * contracts that were already complete. All 9 gameTypes now have a real
//  * interactive player -- see GamePlayPage.tsx's own doc comment for the
//  * build order.
//  */
// export const router = createBrowserRouter([
//   { path: "/login", element: <LoginPage /> },
//   { path: "/register", element: <RegisterPage /> },
//   { path: "/forgot-password", element: <ForgotPasswordPage /> },
//   { path: "/reset-password", element: <ResetPasswordPage /> },
//   { path: "/verify-email", element: <VerifyEmailPage /> },
//   {
//     element: <RequireAuth />,
//     children: [
//       {
//         element: <AdminGuard />,
//         children: [
//           {
//             path: "admin",
//             element: <AdminLayout />,
//             children: [
//               { index: true, element: <AdminDashboardPage /> },
//               { path: "games", element: <AdminGamesListPage /> },
//               { path: "games/:id", element: <AdminGameEditorPage /> },
//               { path: "recipes", element: <AdminRecipesListPage /> },
//               { path: "recipes/:id", element: <AdminRecipeEditorPage /> },
//               { path: "regions", element: <AdminRegionsListPage /> },
//               { path: "regions/:id", element: <AdminRegionEditorPage /> },
//               { path: "nutrition/lessons", element: <AdminNutritionLessonsListPage /> },
//               { path: "nutrition/lessons/:id", element: <AdminNutritionLessonEditorPage /> },
//               { path: "nutrition/food-facts", element: <AdminFoodFactsListPage /> },
//               { path: "nutrition/food-facts/:id", element: <AdminFoodFactEditorPage /> },
//               { path: "achievements", element: <AdminAchievementsListPage /> },
//               { path: "achievements/:id", element: <AdminAchievementEditorPage /> },
//               { path: "daily-challenges", element: <AdminDailyChallengesListPage /> },
//               { path: "daily-challenges/:id", element: <AdminDailyChallengeEditorPage /> },
//               { path: "avatar-cosmetics", element: <AdminAvatarCosmeticsListPage /> },
//               { path: "avatar-cosmetics/:id", element: <AdminAvatarCosmeticEditorPage /> },
//             ],
//           },
//         ],
//       },
//       {
//         element: <AppLayout />,
//         children: [
//           { index: true, element: <Navigate to="/dashboard" replace /> },
//           { path: "dashboard", element: <HomeDashboardPage /> },
//           {
//             path: "flavor-hub",
//             element: <FlavorHubPage />,
//           },
//           {
//             path: "flavor-hub/:slug",
//             element: <RegionDetailPage />,
//           },
//           {
//             path: "games",
//             element: <GamesListPage />,
//           },
//           {
//             path: "games/:slug",
//             element: <GamePlayPage />,
//           },
//           {
//             path: "recipes",
//             element: <RecipesListPage />,
//           },
//           {
//             path: "recipes/:slug",
//             element: <RecipeDetailPage />,
//           },
//           {
//             path: "recipes/:slug/cook",
//             element: <CookingModePage />,
//           },
//           {
//             path: "grocery",
//             element: <GroceryListPage />,
//           },
//           {
//             path: "parent",
//             element: <ParentDashboardPage />,
//           },
//           {
//             path: "parent/children",
//             element: <ManageChildrenPage />,
//           },
//         ],
//       },
//     ],
//   },
//   { path: "*", element: <Navigate to="/dashboard" replace /> },
// ]);
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { RequireAuth } from "./RequireAuth";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "../pages/auth/VerifyEmailPage";
import { PrivacyPolicyPage } from "../pages/privacy-policy/PrivacyPolicyPage";
import { HomeDashboardPage } from "../pages/dashboard/HomeDashboardPage";
import { ParentDashboardPage } from "../pages/parent/ParentDashboardPage";
import { ManageChildrenPage } from "../pages/parent/ManageChildrenPage";
import { FlavorHubPage } from "../pages/flavorHub/FlavorHubPage";
import { RegionDetailPage } from "../pages/flavorHub/RegionDetailPage";
import { GamesListPage } from "../pages/games/GamesListPage";
import { GamePlayPage } from "../pages/games/GamePlayPage";
import { RecipesListPage } from "../pages/recipes/RecipesListPage";
import { RecipeDetailPage } from "../pages/recipes/RecipeDetailPage";
import { CookingModePage } from "../pages/recipes/CookingModePage";
import { GroceryListPage } from "../pages/grocery/GroceryListPage";
import { AdminGuard } from "../admin/components/AdminGuard";
import { AdminLayout } from "../admin/components/AdminLayout";
import { AdminDashboardPage } from "../admin/pages/AdminDashboardPage";
import { AdminGamesListPage } from "../admin/pages/games/AdminGamesListPage";
import { AdminGameEditorPage } from "../admin/pages/games/AdminGameEditorPage";
import { AdminRecipesListPage } from "../admin/pages/recipes/AdminRecipesListPage";
import { AdminRecipeEditorPage } from "../admin/pages/recipes/AdminRecipeEditorPage";
import { AdminRegionsListPage } from "../admin/pages/regions/AdminRegionsListPage";
import { AdminRegionEditorPage } from "../admin/pages/regions/AdminRegionEditorPage";
import { AdminNutritionLessonsListPage } from "../admin/pages/nutrition/AdminNutritionLessonsListPage";
import { AdminNutritionLessonEditorPage } from "../admin/pages/nutrition/AdminNutritionLessonEditorPage";
import { AdminFoodFactsListPage } from "../admin/pages/nutrition/AdminFoodFactsListPage";
import { AdminFoodFactEditorPage } from "../admin/pages/nutrition/AdminFoodFactEditorPage";
import { AdminAchievementsListPage } from "../admin/pages/achievements/AdminAchievementsListPage";
import { AdminAchievementEditorPage } from "../admin/pages/achievements/AdminAchievementEditorPage";
import { AdminDailyChallengesListPage } from "../admin/pages/dailyChallenges/AdminDailyChallengesListPage";
import { AdminDailyChallengeEditorPage } from "../admin/pages/dailyChallenges/AdminDailyChallengeEditorPage";
import { AdminAvatarCosmeticsListPage } from "../admin/pages/avatarCosmetics/AdminAvatarCosmeticsListPage";
import { AdminAvatarCosmeticEditorPage } from "../admin/pages/avatarCosmetics/AdminAvatarCosmeticEditorPage";

/**
 * Route structure:
 *  /login, /register, /forgot-password, /reset-password, /verify-email, /privacy -- public
 *  /admin/*                                                                      -- behind RequireAuth AND AdminGuard
 *                                                                                    (platform_admin role), rendered
 *                                                                                    inside the separate AdminLayout shell
 *  everything else                                                               -- behind RequireAuth,
 *                                                                                    rendered inside AppLayout
 */
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/privacy", element: <PrivacyPolicyPage /> },
  { path: "/privacy-policy", element: <Navigate to="/privacy" replace /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminGuard />,
        children: [
          {
            path: "admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "games", element: <AdminGamesListPage /> },
              { path: "games/:id", element: <AdminGameEditorPage /> },
              { path: "recipes", element: <AdminRecipesListPage /> },
              { path: "recipes/:id", element: <AdminRecipeEditorPage /> },
              { path: "regions", element: <AdminRegionsListPage /> },
              { path: "regions/:id", element: <AdminRegionEditorPage /> },
              { path: "nutrition/lessons", element: <AdminNutritionLessonsListPage /> },
              { path: "nutrition/lessons/:id", element: <AdminNutritionLessonEditorPage /> },
              { path: "nutrition/food-facts", element: <AdminFoodFactsListPage /> },
              { path: "nutrition/food-facts/:id", element: <AdminFoodFactEditorPage /> },
              { path: "achievements", element: <AdminAchievementsListPage /> },
              { path: "achievements/:id", element: <AdminAchievementEditorPage /> },
              { path: "daily-challenges", element: <AdminDailyChallengesListPage /> },
              { path: "daily-challenges/:id", element: <AdminDailyChallengeEditorPage /> },
              { path: "avatar-cosmetics", element: <AdminAvatarCosmeticsListPage /> },
              { path: "avatar-cosmetics/:id", element: <AdminAvatarCosmeticEditorPage /> },
            ],
          },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <HomeDashboardPage /> },
          {
            path: "flavor-hub",
            element: <FlavorHubPage />,
          },
          {
            path: "flavor-hub/:slug",
            element: <RegionDetailPage />,
          },
          {
            path: "games",
            element: <GamesListPage />,
          },
          {
            path: "games/:slug",
            element: <GamePlayPage />,
          },
          {
            path: "recipes",
            element: <RecipesListPage />,
          },
          {
            path: "recipes/:slug",
            element: <RecipeDetailPage />,
          },
          {
            path: "recipes/:slug/cook",
            element: <CookingModePage />,
          },
          {
            path: "grocery",
            element: <GroceryListPage />,
          },
          {
            path: "parent",
            element: <ParentDashboardPage />,
          },
          {
            path: "parent/children",
            element: <ManageChildrenPage />,
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);