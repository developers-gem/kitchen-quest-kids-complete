import { Link } from "react-router-dom";
import { AdminContentListPage } from "../../components/AdminContentListPage";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { adminRegionsApi } from "../../api/adminRegions";
import type { AdminRegion } from "../../types/contentTypes";

export function AdminRegionsListPage() {
  return (
    <AdminContentListPage<AdminRegion>
      title="Regions"
      queryKey="admin-regions"
      fetchList={adminRegionsApi.list}
      createPath="/admin/regions/new"
      searchPlaceholder="Search regions by name..."
      columns={["Name", "Unlock order", "Scope", "Status", ""]}
      renderRow={(region) => (
        <>
          <td className="px-4 py-3 font-semibold">{region.name}</td>
          <td className="px-4 py-3 text-neutral-500">{region.unlockOrder}</td>
          <td className="px-4 py-3 text-neutral-500">{region.scopeType}</td>
          <td className="px-4 py-3">
            <ContentStatusBadge status={region.status} />
          </td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/regions/${region._id}`} className="font-semibold text-primary hover:underline">
              Edit
            </Link>
          </td>
        </>
      )}
    />
  );
}
