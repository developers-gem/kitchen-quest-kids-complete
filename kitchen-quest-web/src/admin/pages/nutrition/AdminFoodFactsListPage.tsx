import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminFoodFactsApi } from "../../api/adminNutrition";
import type { AdminFoodFact } from "../../types/contentTypes";

export function AdminFoodFactsListPage() {
  return (
    <AdminContentListPage<AdminFoodFact>
      title="Food Facts"
      queryKey="admin-food-facts"
      fetchList={adminFoodFactsApi.list}
      createPath="/admin/nutrition/food-facts/new"
      searchPlaceholder="Search by food name..."
      columns={["Food", "Fact", "Age groups", "Status", ""]}
      renderRow={(fact) => (
        <>
          <td className="px-4 py-3 font-semibold">{fact.foodName}</td>
          <td className="max-w-md truncate px-4 py-3 text-neutral-500">{fact.fact}</td>
          <td className="px-4 py-3 text-neutral-500">{fact.ageGroups.join(", ")}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={fact.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/nutrition/food-facts/${fact._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
