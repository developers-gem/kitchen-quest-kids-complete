import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { JsonField } from "../../components/JsonField";
import { adminAvatarCosmeticsApi } from "../../api/adminAvatarCosmetics";
import type { AdminAvatarCosmetic } from "../../types/contentTypes";

type FormState = Partial<AdminAvatarCosmetic>;

const SLOTS: AdminAvatarCosmetic["slot"][] = ["hat", "accessory", "background", "colorVariant"];

const BLANK: FormState = {
  label: "",
  slot: "hat",
  assetKey: "",
  unlockRequirements: { type: "always" },
};

export function AdminAvatarCosmeticEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-avatar-cosmetics", id],
    queryFn: () => adminAvatarCosmeticsApi.getById(id!),
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
        const created = await adminAvatarCosmeticsApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-avatar-cosmetics"] });
        navigate(`/admin/avatar-cosmetics/${created._id}`, { replace: true });
      } else {
        const updated = await adminAvatarCosmeticsApi.update(id!, form);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-avatar-cosmetics"] });
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
      const updated = await adminAvatarCosmeticsApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-avatar-cosmetics"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Avatar Cosmetic" : form.label}</h1>
        {!isNew && form.status && <ContentStatusBadge status={form.status} />}
      </div>

      {!isNew && form.status && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Workflow</p>
          <WorkflowActions currentStatus={form.status} onTransition={handleTransition} />
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <div>
          <label htmlFor="cosmetic-label" className="text-sm font-semibold text-foreground/70">
            Label
          </label>
          <input
            id="cosmetic-label"
            value={form.label ?? ""}
            onChange={(e) => update("label", e.target.value)}
            placeholder="e.g. Golden Chef Hat"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cosmetic-slot" className="text-sm font-semibold text-foreground/70">
              Slot
            </label>
            <select
              id="cosmetic-slot"
              value={form.slot ?? "hat"}
              onChange={(e) => update("slot", e.target.value as AdminAvatarCosmetic["slot"])}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cosmetic-asset-key" className="text-sm font-semibold text-foreground/70">
              Asset key
            </label>
            <input
              id="cosmetic-asset-key"
              value={form.assetKey ?? ""}
              onChange={(e) => update("assetKey", e.target.value)}
              placeholder="Storage key, emoji, or CSS token"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
        </div>

        <JsonField
          label="Unlock requirements"
          value={form.unlockRequirements}
          onChange={(v) => update("unlockRequirements", v as never)}
          hint='e.g. { "type": "always" } or { "type": "levelAtLeast", "value": 5 } -- evaluated by the same shared unlock rule engine as games, recipes, and regions.'
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
    </div>
  );
}
