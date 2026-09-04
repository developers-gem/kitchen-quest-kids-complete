import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminGamesApi } from "../../api/adminGames";
import type { AdminGame } from "../../types/contentTypes";

export function AdminGamesListPage() {
  return (
    <AdminContentListPage<AdminGame>
      title="Games"
      queryKey="admin-games"
      fetchList={adminGamesApi.list}
      createPath="/admin/games/new"
      searchPlaceholder="Search games by title..."
      columns={["Title", "Type", "Age groups", "XP", "Status", ""]}
      renderRow={(game) => (
        <>
          <td className="px-4 py-3 font-semibold">{game.title}</td>
          <td className="px-4 py-3 text-neutral-500">{game.gameType}</td>
          <td className="px-4 py-3 text-neutral-500">{game.ageGroups.join(", ")}</td>
          <td className="px-4 py-3 text-neutral-500">{game.xpReward}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={game.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/games/${game._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
