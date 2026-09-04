import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { JsonField } from "../../components/JsonField";
import { adminAchievementsApi } from "../../api/adminAchievements";
import type { AdminAchievement } from "../../types/contentTypes";

type FormState = Partial<AdminAchievement>;

const CATEGORIES: AdminAchievement["category"][] = [
  "exploration",
  "cooking",
  "nutrition",
  "streak",
  "social",
  "mastery",
];
const RARITIES: AdminAchievement["rarity"][] = ["common", "uncommon", "rare", "legendary"];

const BLANK: FormState = {
  title: "",
  description: "",
  category: "cooking",
  unlockCriteria: { type: "recipesCompleted", value: 5 },
  xpReward: 0,
  rarity: "common",
};

export function AdminAchievementEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-achievements", id],
    queryFn: () => adminAchievementsApi.getById(id!),
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
        const created = await adminAchievementsApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-achievements"] });
        navigate(`/admin/achievements/${created._id}`, { replace: true });
      } else {
        const updated = await adminAchievementsApi.update(id!, form);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-achievements"] });
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
      const updated = await adminAchievementsApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-achievements"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Achievement" : form.title}</h1>
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
          <label className="text-sm font-semibold text-foreground/70">Title</label>
          <input
            value={form.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground/70">Description</label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Category</label>
            <select
              value={form.category ?? "cooking"}
              onChange={(e) => update("category", e.target.value as never)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">Rarity</label>
            <select
              value={form.rarity ?? "common"}
              onChange={(e) => update("rarity", e.target.value as never)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">XP reward</label>
            <input
              type="number"
              value={form.xpReward ?? 0}
              onChange={(e) => update("xpReward", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground/70">Icon (storage key, optional)</label>
          <input
            value={form.icon ?? ""}
            onChange={(e) => update("icon", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <JsonField
          label="Unlock criteria"
          value={form.unlockCriteria}
          onChange={(v) => update("unlockCriteria", v as never)}
          hint='e.g. { "type": "recipesCompleted", "value": 5 } or { "type": "gameStarsAtLeast", "gameId": "...", "stars": 3 }. Evaluated by the same shared unlock rule engine as games, recipes, and regions -- checkAndAwardAchievements runs this after every game/recipe/lesson/challenge completion.'
          rows={4}
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
