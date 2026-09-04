import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminRecipesApi } from "../../api/adminRecipes";
import type { AdminRecipe } from "../../types/contentTypes";

export function AdminRecipesListPage() {
  return (
    <AdminContentListPage<AdminRecipe>
      title="Recipes"
      queryKey="admin-recipes"
      fetchList={adminRecipesApi.list}
      createPath="/admin/recipes/new"
      searchPlaceholder="Search recipes by title..."
      columns={["Title", "Difficulty", "Steps", "XP", "Status", ""]}
      renderRow={(recipe) => (
        <>
          <td className="px-4 py-3 font-semibold">{recipe.title}</td>
          <td className="px-4 py-3 text-neutral-500">{recipe.difficulty}</td>
          <td className="px-4 py-3 text-neutral-500">{recipe.steps.length}</td>
          <td className="px-4 py-3 text-neutral-500">{recipe.xpReward}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={recipe.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/recipes/${recipe._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
