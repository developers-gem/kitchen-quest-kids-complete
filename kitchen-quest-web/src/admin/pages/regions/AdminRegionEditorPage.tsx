import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { TagListInput } from "../../components/TagListInput";
import { JsonField } from "../../components/JsonField";
import { adminRegionsApi } from "../../api/adminRegions";
import type { AdminRegion } from "../../types/contentTypes";

type FormState = Partial<AdminRegion>;

const BLANK: FormState = {
  name: "",
  slug: "",
  scopeType: "usState",
  featuredFoods: [],
  unlockOrder: 1,
  unlockRequirements: { type: "always" },
};

export function AdminRegionEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-regions", id],
    queryFn: () => adminRegionsApi.getById(id!),
    enabled: !isNew,
  });

  const { data: assignedContent } = useQuery({
    queryKey: ["admin-regions", id, "content"],
    queryFn: () => adminRegionsApi.getAssignedContent(id!),
    enabled: !isNew,
  });

  const [form, setForm] = useState<FormState>(BLANK);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      if (isNew) {
        const created = await adminRegionsApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-regions"] });
        navigate(`/admin/regions/${created._id}`, { replace: true });
      } else {
        const updated = await adminRegionsApi.update(id!, form);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-regions"] });
        setSavedMessage("Saved");
      }
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(nextStatus: "draft" | "review" | "published" | "archived") {
    if (!id || isNew) return;
    try {
      const updated = await adminRegionsApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-regions"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Region" : form.name}</h1>
        {!isNew && form.status && <ContentStatusBadge status={form.status} />}
      </div>

      {!isNew && form.status && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Workflow</p>
          <WorkflowActions currentStatus={form.status} onTransition={handleTransition} />
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Name</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">Slug</label>
            <input
              value={form.slug ?? ""}
              onChange={(e) => update("slug", e.target.value)}
              disabled={!isNew}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 disabled:bg-neutral-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Scope type</label>
            <select
              value={form.scopeType ?? "usState"}
              onChange={(e) => update("scopeType", e.target.value as never)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              <option value="usState">US State</option>
              <option value="usRegion">US Region</option>
              <option value="country">Country</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">State/display label</label>
            <input
              value={form.state ?? ""}
              onChange={(e) => update("state", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">Unlock order</label>
            <input
              type="number"
              value={form.unlockOrder ?? 1}
              onChange={(e) => update("unlockOrder", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground/70">Location description</label>
          <textarea
            value={form.locationDescription ?? ""}
            onChange={(e) => update("locationDescription", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <TagListInput
          label="Featured foods"
          values={form.featuredFoods ?? []}
          onChange={(v) => update("featuredFoods", v)}
        />

        <JsonField
          label="Unlock requirements"
          value={form.unlockRequirements}
          onChange={(v) => update("unlockRequirements", v as never)}
          hint='e.g. { "type": "always" } or { "type": "levelAtLeast", "value": 3 }'
          rows={3}
        />

        {saveError && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {saveError}
          </p>
        )}
        {savedMessage && <p className="text-sm font-semibold text-accent">{savedMessage}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="min-h-11 rounded-lg bg-neutral-900 px-5 py-2.5 font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : isNew ? "Create draft" : "Save changes"}
        </button>
      </div>

      {!isNew && assignedContent && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 font-bold">Assigned games ({assignedContent.games.length})</h2>
            <p className="mb-3 text-xs text-neutral-400">
              Assigned by setting a game's own "region" field via its editor -- not managed here directly.
            </p>
            {assignedContent.games.length === 0 ? (
              <p className="text-sm text-neutral-400">No games assigned yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {assignedContent.games.map((g) => (
                  <li key={g._id} className="flex items-center justify-between">
                    <span>{g.title}</span>
                    <ContentStatusBadge status={g.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 font-bold">Assigned recipes ({assignedContent.recipes.length})</h2>
            {assignedContent.recipes.length === 0 ? (
              <p className="text-sm text-neutral-400">No recipes assigned yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {assignedContent.recipes.map((r) => (
                  <li key={r._id} className="flex items-center justify-between">
                    <span>{r.title}</span>
                    <ContentStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
