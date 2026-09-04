import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AGE_RANGES } from "../../../types/api";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { adminFoodFactsApi } from "../../api/adminNutrition";
import type { AdminFoodFact } from "../../types/contentTypes";

type FormState = Partial<AdminFoodFact>;

const BLANK: FormState = { foodName: "", fact: "", ageGroups: [] };

export function AdminFoodFactEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-food-facts", id],
    queryFn: () => adminFoodFactsApi.getById(id!),
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

  function toggleAgeGroup(range: string) {
    const current = form.ageGroups ?? [];
    update(
      "ageGroups",
      (current.includes(range as never) ? current.filter((r) => r !== range) : [...current, range]) as never
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      if (isNew) {
        const created = await adminFoodFactsApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-food-facts"] });
        navigate(`/admin/nutrition/food-facts/${created._id}`, { replace: true });
      } else {
        const updated = await adminFoodFactsApi.update(id!, form);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-food-facts"] });
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
      const updated = await adminFoodFactsApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-food-facts"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Food Fact" : form.foodName}</h1>
        {!isNew && form.status && <ContentStatusBadge status={form.status} />}
      </div>

      {!isNew && form.status && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <WorkflowActions currentStatus={form.status} onTransition={handleTransition} />
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <div>
          <label className="text-sm font-semibold text-foreground/70">Food name</label>
          <input
            value={form.foodName ?? ""}
            onChange={(e) => update("foodName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground/70">Fact (max 280 characters)</label>
          <textarea
            value={form.fact ?? ""}
            onChange={(e) => update("fact", e.target.value)}
            maxLength={280}
            rows={3}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
          <p className="mt-1 text-xs text-neutral-400">{(form.fact ?? "").length}/280</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground/70">Topic (optional)</label>
          <input
            value={form.topic ?? ""}
            onChange={(e) => update("topic", e.target.value)}
            placeholder="e.g. vitamin-c, fun-fact, history"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground/70">Age groups</label>
          <div className="mt-1 flex gap-2">
            {AGE_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => toggleAgeGroup(range)}
                className={`min-h-11 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  form.ageGroups?.includes(range as never) ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

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
