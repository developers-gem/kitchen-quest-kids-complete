import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminNutritionLessonsApi } from "../../api/adminNutrition";
import type { AdminNutritionLesson } from "../../types/contentTypes";

export function AdminNutritionLessonsListPage() {
  return (
    <AdminContentListPage<AdminNutritionLesson>
      title="Nutrition Lessons"
      queryKey="admin-nutrition-lessons"
      fetchList={adminNutritionLessonsApi.list}
      createPath="/admin/nutrition/lessons/new"
      searchPlaceholder="Search lessons by title..."
      columns={["Title", "Topic", "Age groups", "XP", "Status", ""]}
      renderRow={(lesson) => (
        <>
          <td className="px-4 py-3 font-semibold">{lesson.title}</td>
          <td className="px-4 py-3 text-neutral-500">{lesson.topic}</td>
          <td className="px-4 py-3 text-neutral-500">{lesson.ageGroups.join(", ")}</td>
          <td className="px-4 py-3 text-neutral-500">{lesson.xpReward}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={lesson.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/nutrition/lessons/${lesson._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
