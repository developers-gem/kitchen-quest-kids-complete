import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { useParentalGate } from "../../context/ParentalGateContext";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { AvatarSelector } from "../../components/AvatarSelector";
import { getErrorMessage } from "../../lib/errors";
import * as childrenApi from "../../api/children";
import * as avatarsApi from "../../api/avatars";
import { AGE_RANGES, type AgeRange, type ChildProfile } from "../../types/api";

/**
 * FIXED (found while closing the avatar-cosmetics gap, not the original
 * task): this screen didn't exist at all. HomeDashboardPage's empty
 * state links to "/parent/children/new" -- a route that has never
 * existed in this router. Any brand-new parent with zero children
 * clicking "Add your first chef" was silently redirected back to the
 * dashboard by the router's catch-all, with no way to ever create a
 * child profile through the web app. This is the highest-severity bug
 * found in this whole project: it blocks onboarding entirely for any
 * web-only user. Mirrors Flutter's ManageChildrenScreen, which had
 * already solved this same problem on mobile.
 */
export function ManageChildrenPage() {
  const { children, isLoading, refetch } = useActiveChild();
  const [editingChild, setEditingChild] = useState<ChildProfile | "new" | null>(null);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground">Manage your chefs</h1>
        <button
          onClick={() => setEditingChild("new")}
          className="min-h-11 rounded-full bg-primary px-4 py-2.5 font-bold text-primary-foreground"
        >
          + Add a chef
        </button>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && children.length === 0 && (
        <EmptyState
          icon="🧑‍🍳"
          title="No chefs yet!"
          description="Add a child profile to start their food adventure."
          action={
            <button
              onClick={() => setEditingChild("new")}
              className="min-h-11 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
            >
              Add your first chef
            </button>
          }
        />
      )}

      {!isLoading && children.length > 0 && (
        <ul className="space-y-3">
          {children.map((child) => (
            <li key={child._id} className="flex items-center justify-between rounded-3xl bg-surface p-4">
              <div>
                <p className="font-bold text-foreground">{child.displayName}</p>
                <p className="text-sm text-foreground/50">
                  {child.ageRange} · Level {child.currentLevel}
                </p>
              </div>
              <button onClick={() => setEditingChild(child)} className="min-h-11 rounded-full border border-foreground/10 px-4 py-2 text-sm font-semibold">
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm text-foreground/60">
        <Link to="/dashboard" className="font-semibold text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>

      {editingChild && (
        <ChildEditorModal
          child={editingChild === "new" ? null : editingChild}
          onClose={() => setEditingChild(null)}
          onSaved={() => {
            setEditingChild(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ChildEditorModal({
  child,
  onClose,
  onSaved,
}: {
  child: ChildProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { ensureGate } = useParentalGate();
  const queryClient = useQueryClient();
  const [gateChecked, setGateChecked] = useState(false);
  const [gateDenied, setGateDenied] = useState(false);

  const [displayName, setDisplayName] = useState(child?.displayName ?? "");
  const [ageRange, setAgeRange] = useState<AgeRange>(child?.ageRange ?? "7-9");
  const [avatarConfigId, setAvatarConfigId] = useState(child?.avatarConfigId);
  const [avatarColor, setAvatarColor] = useState(child?.avatarColor ?? "primary");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureGate().then((ok) => {
      if (cancelled) return;
      setGateChecked(true);
      setGateDenied(!ok);
      if (!ok) onClose();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: catalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["avatars", child?._id],
    queryFn: () => avatarsApi.getAvatarCatalog(child?._id),
    enabled: gateChecked && !gateDenied,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = { displayName, ageRange, avatarConfigId, avatarColor };
      return child ? childrenApi.updateChild(child._id, input) : childrenApi.createChild(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avatars"] });
      onSaved();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => childrenApi.deleteChild(child!._id),
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (!gateChecked || gateDenied) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-black text-foreground">{child ? `Edit ${child.displayName}` : "Add a chef"}</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="displayName" className="text-sm font-semibold text-foreground/70">
              Name
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-2.5"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground/70">Age range</label>
            <div className="mt-1 flex gap-2">
              {AGE_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setAgeRange(range)}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
                    ageRange === range ? "bg-foreground text-white" : "bg-foreground/5 text-foreground/60"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {isLoadingCatalog && <LoadingState label="Loading avatar options..." />}
          {catalog && (
            <AvatarSelector
              catalog={catalog}
              selectedCharacterId={avatarConfigId}
              selectedColor={avatarColor}
              onSelectCharacter={setAvatarConfigId}
              onSelectColor={(color) => setAvatarColor(color as typeof avatarColor)}
            />
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="min-h-11 flex-1 rounded-full border border-foreground/10 py-3 font-semibold">
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !displayName.trim()}
              className="min-h-11 flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>

          {child && (
            <button
              onClick={() => {
                if (confirm(`Remove ${child.displayName}'s profile? Their progress is kept, but they'll disappear from your family.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="min-h-11 w-full text-sm font-semibold text-danger disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove this chef"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
