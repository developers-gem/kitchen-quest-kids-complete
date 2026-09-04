import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminDailyChallengesApi } from "../../api/adminDailyChallenges";
import type { AdminDailyChallenge } from "../../types/contentTypes";

export function AdminDailyChallengesListPage() {
  return (
    <AdminContentListPage<AdminDailyChallenge>
      title="Daily Challenges"
      queryKey="admin-daily-challenges"
      fetchList={adminDailyChallengesApi.list}
      createPath="/admin/daily-challenges/new"
      searchPlaceholder="Search challenges by title..."
      columns={["Title", "Type", "Date range", "XP", "Status", ""]}
      renderRow={(challenge) => (
        <>
          <td className="px-4 py-3 font-semibold">{challenge.title}</td>
          <td className="px-4 py-3 text-neutral-500">{challenge.challengeType}</td>
          <td className="px-4 py-3 text-neutral-500">
            {new Date(challenge.dateRange.startDate).toLocaleDateString()} &ndash;{" "}
            {new Date(challenge.dateRange.endDate).toLocaleDateString()}
          </td>
          <td className="px-4 py-3 text-neutral-500">{challenge.xpReward}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={challenge.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/daily-challenges/${challenge._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
