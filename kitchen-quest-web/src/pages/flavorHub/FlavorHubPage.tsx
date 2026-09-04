import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { RegionCard } from "../../components/RegionCard";
import { getErrorMessage } from "../../lib/errors";
import * as regionsApi from "../../api/regions";

/**
 * Closes another slice of production readiness audit finding A4 --
 * region browsing was a ComingSoonPage placeholder despite the backend's
 * region.service.js (list + per-child unlock annotation) being complete
 * and tested, and RegionCard already having been built and sitting
 * unused. This page is the missing piece connecting the two.
 */
export function FlavorHubPage() {
  const { activeChild, isLoading: isLoadingChildren, children } = useActiveChild();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["regions", activeChild?._id],
    queryFn: () => regionsApi.listRegions(activeChild?._id),
    // No point firing this once we already know the family has no
    // children -- avoids an unnecessary request (and, in tests, a
    // React Query warning about an unmocked call resolving to
    // `undefined`) for a screen that's about to show an empty state
    // instead of any query result anyway.
    enabled: !isLoadingChildren && children.length > 0,
  });

  if (isLoadingChildren) return <LoadingState label="Loading your family..." />;

  if (children.length === 0) {
    return (
      <EmptyState
        icon="🗺️"
        title="No chefs yet!"
        description="Add a child profile to start exploring the Flavor Hub."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Flavor Hub</h1>
        <p className="text-sm text-foreground/60">
          Explore regions and unlock new food adventures{activeChild ? ` for ${activeChild.displayName}` : ""}.
        </p>
      </div>

      {isLoading && <LoadingState label="Loading regions..." />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.length === 0 && (
        <EmptyState title="No regions available yet" description="Check back soon for new places to explore!" />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((region) => (
            <RegionCard key={region._id} region={region} />
          ))}
        </div>
      )}
    </div>
  );
}
