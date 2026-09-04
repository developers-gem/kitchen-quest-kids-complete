import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AGE_RANGES, type IngredientLine, type RecipeStep } from "../../../types/api";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { TagListInput } from "../../components/TagListInput";
import { adminRecipesApi } from "../../api/adminRecipes";
import type { AdminRecipe } from "../../types/contentTypes";

type FormState = Partial<AdminRecipe>;

const BLANK: FormState = {
  title: "",
  slug: "",
  description: "",
  ageGroups: [],
  difficulty: "easy",
  preparationTimeMinutes: 10,
  cookingTimeMinutes: 10,
  totalTimeMinutes: 20,
  ingredients: [],
  steps: [],
  cookingSkills: [],
  nutritionLearning: [],
  funFacts: [],
  learningObjectives: [],
  xpReward: 40,
  supervisionRequired: true,
  knifeSafety: false,
  heatSafety: false,
  allergenInformation: [],
  requiresParentVerification: true,
};

const BLANK_INGREDIENT: IngredientLine = { name: "", category: "Produce" };
const BLANK_STEP: RecipeStep = { stepNumber: 1, title: "", instruction: "", safetyLevel: "none" };

export function AdminRecipeEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-recipes", id],
    queryFn: () => adminRecipesApi.getById(id!),
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

  function updateIngredient(index: number, patch: Partial<IngredientLine>) {
    const next = [...(form.ingredients ?? [])];
    next[index] = { ...next[index], ...patch };
    update("ingredients", next);
  }

  function updateStep(index: number, patch: Partial<RecipeStep>) {
    const next = [...(form.steps ?? [])];
    next[index] = { ...next[index], ...patch };
    update("steps", next);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      if (isNew) {
        const created = await adminRecipesApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
        navigate(`/admin/recipes/${created._id}`, { replace: true });
      } else {
        const updated = await adminRecipesApi.update(id!, form);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
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
      const updated = await adminRecipesApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Recipe" : form.title}</h1>
        {!isNew && form.status && <ContentStatusBadge status={form.status} />}
      </div>

      {!isNew && form.status && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Workflow</p>
          <WorkflowActions currentStatus={form.status} onTransition={handleTransition} />
          <p className="mt-3 text-xs text-neutral-400">
            Version {form.version} · Created by {form.createdBy ?? "—"} · Last updated by {form.updatedBy ?? "—"}
          </p>
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Title</label>
            <input
              value={form.title ?? ""}
              onChange={(e) => update("title", e.target.value)}
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

        <div>
          <label className="text-sm font-semibold text-foreground/70">Description</label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
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

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Difficulty</label>
            <select
              value={form.difficulty ?? "easy"}
              onChange={(e) => update("difficulty", e.target.value as never)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">Prep (min)</label>
            <input
              type="number"
              value={form.preparationTimeMinutes ?? 0}
              onChange={(e) => update("preparationTimeMinutes", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">Cook (min)</label>
            <input
              type="number"
              value={form.cookingTimeMinutes ?? 0}
              onChange={(e) => update("cookingTimeMinutes", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">XP reward</label>
            <input
              type="number"
              value={form.xpReward ?? 40}
              onChange={(e) => update("xpReward", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground/70">Ingredients</label>
            <button
              type="button"
              onClick={() => update("ingredients", [...(form.ingredients ?? []), { ...BLANK_INGREDIENT }])}
              className="text-sm font-semibold text-primary"
            >
              + Add ingredient
            </button>
          </div>
          <div className="space-y-2">
            {(form.ingredients ?? []).map((ing, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 rounded-lg bg-neutral-50 p-2">
                <input
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  placeholder="Name"
                  className="col-span-4 rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  value={ing.quantity ?? ""}
                  onChange={(e) => updateIngredient(i, { quantity: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Qty"
                  className="col-span-2 rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <input
                  value={ing.unit ?? ""}
                  onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                  placeholder="Unit"
                  className="col-span-2 rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <input
                  value={ing.category}
                  onChange={(e) => updateIngredient(i, { category: e.target.value })}
                  placeholder="Category (grocery aisle)"
                  className="col-span-3 rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => update("ingredients", (form.ingredients ?? []).filter((_, idx) => idx !== i))}
                  className="col-span-1 text-danger"
                  aria-label="Remove ingredient"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground/70">Steps</label>
            <button
              type="button"
              onClick={() =>
                update("steps", [
                  ...(form.steps ?? []),
                  { ...BLANK_STEP, stepNumber: (form.steps?.length ?? 0) + 1 },
                ])
              }
              className="text-sm font-semibold text-primary"
            >
              + Add step
            </button>
          </div>
          <div className="space-y-3">
            {(form.steps ?? []).map((step, i) => (
              <div key={i} className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400">Step {step.stepNumber}</span>
                  <button
                    type="button"
                    onClick={() => update("steps", (form.steps ?? []).filter((_, idx) => idx !== i))}
                    className="text-danger"
                    aria-label="Remove step"
                  >
                    &times;
                  </button>
                </div>
                <input
                  value={step.title}
                  onChange={(e) => updateStep(i, { title: e.target.value })}
                  placeholder="Step title"
                  className="mt-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <textarea
                  value={step.instruction}
                  onChange={(e) => updateStep(i, { instruction: e.target.value })}
                  placeholder="Full instruction (parent mode)"
                  rows={2}
                  className="mt-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <textarea
                  value={step.simpleInstruction ?? ""}
                  onChange={(e) => updateStep(i, { simpleInstruction: e.target.value })}
                  placeholder="Simple instruction (child mode) -- optional, falls back to the full instruction"
                  rows={1}
                  className="mt-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <div className="mt-2 flex items-center gap-3">
                  <select
                    value={step.safetyLevel}
                    onChange={(e) => updateStep(i, { safetyLevel: e.target.value as RecipeStep["safetyLevel"] })}
                    className="rounded border border-neutral-200 px-2 py-1 text-sm"
                  >
                    <option value="none">No safety concern</option>
                    <option value="lowHeat">Low heat</option>
                    <option value="highHeat">High heat</option>
                    <option value="sharpTool">Sharp tool</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(step.parentAssistanceRequired)}
                      onChange={(e) => updateStep(i, { parentAssistanceRequired: e.target.checked })}
                    />
                    Needs a grown-up
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <TagListInput label="Cooking skills" values={form.cookingSkills ?? []} onChange={(v) => update("cookingSkills", v)} />
        <TagListInput
          label="Nutrition learning points"
          values={form.nutritionLearning ?? []}
          onChange={(v) => update("nutritionLearning", v)}
        />
        <TagListInput label="Fun facts" values={form.funFacts ?? []} onChange={(v) => update("funFacts", v)} />
        <TagListInput
          label="Allergen information"
          values={form.allergenInformation ?? []}
          onChange={(v) => update("allergenInformation", v)}
          placeholder="e.g. dairy, nuts, gluten"
        />

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(form.supervisionRequired)}
              onChange={(e) => update("supervisionRequired", e.target.checked)}
            />
            Supervision required
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(form.knifeSafety)}
              onChange={(e) => update("knifeSafety", e.target.checked)}
            />
            Involves knife use
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(form.heatSafety)}
              onChange={(e) => update("heatSafety", e.target.checked)}
            />
            Involves heat
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(form.requiresParentVerification)}
              onChange={(e) => update("requiresParentVerification", e.target.checked)}
            />
            Requires parent verification before XP is awarded
          </label>
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
