import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminAchievementsApi } from "../../api/adminAchievements";
import type { AdminAchievement } from "../../types/contentTypes";

export function AdminAchievementsListPage() {
  return (
    <AdminContentListPage<AdminAchievement>
      title="Achievements"
      queryKey="admin-achievements"
      fetchList={adminAchievementsApi.list}
      createPath="/admin/achievements/new"
      searchPlaceholder="Search achievements by title..."
      columns={["Title", "Category", "Rarity", "XP", "Status", ""]}
      renderRow={(achievement) => (
        <>
          <td className="px-4 py-3 font-semibold">{achievement.title}</td>
          <td className="px-4 py-3 text-neutral-500">{achievement.category}</td>
          <td className="px-4 py-3 text-neutral-500">{achievement.rarity}</td>
          <td className="px-4 py-3 text-neutral-500">{achievement.xpReward}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={achievement.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/achievements/${achievement._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
