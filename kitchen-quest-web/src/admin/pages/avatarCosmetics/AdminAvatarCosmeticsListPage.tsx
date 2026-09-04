import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminAvatarCosmeticsApi } from "../../api/adminAvatarCosmetics";
import type { AdminAvatarCosmetic } from "../../types/contentTypes";

export function AdminAvatarCosmeticsListPage() {
  return (
    <AdminContentListPage<AdminAvatarCosmetic>
      title="Avatar Cosmetics"
      queryKey="admin-avatar-cosmetics"
      fetchList={adminAvatarCosmeticsApi.list}
      createPath="/admin/avatar-cosmetics/new"
      searchPlaceholder="Search cosmetics by label..."
      columns={["Label", "Slot", "Asset key", "Status", ""]}
      renderRow={(cosmetic) => (
        <>
          <td className="px-4 py-3 font-semibold">{cosmetic.label}</td>
          <td className="px-4 py-3 text-neutral-500">{cosmetic.slot}</td>
          <td className="px-4 py-3 text-neutral-500">{cosmetic.assetKey}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={cosmetic.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/avatar-cosmetics/${cosmetic._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
