import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AGE_RANGES } from "../../../types/api";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { TagListInput } from "../../components/TagListInput";
import { JsonField } from "../../components/JsonField";
import { adminNutritionLessonsApi } from "../../api/adminNutrition";
import type { AdminNutritionLesson } from "../../types/contentTypes";

type FormState = Partial<AdminNutritionLesson>;

const BLANK: FormState = {
  title: "",
  slug: "",
  ageGroups: [],
  topic: "",
  content: "",
  media: [],
  learningObjectives: [],
  xpReward: 15,
};

export function AdminNutritionLessonEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-nutrition-lessons", id],
    queryFn: () => adminNutritionLessonsApi.getById(id!),
    enabled: !isNew,
  });

  const [form, setForm] = useState<FormState>(BLANK);
  const [includeQuiz, setIncludeQuiz] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm(existing);
      setIncludeQuiz(Boolean(existing.quiz));
    }
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
    const payload = { ...form, quiz: includeQuiz ? form.quiz : undefined };
    try {
      if (isNew) {
        const created = await adminNutritionLessonsApi.create(payload);
        await queryClient.invalidateQueries({ queryKey: ["admin-nutrition-lessons"] });
        navigate(`/admin/nutrition/lessons/${created._id}`, { replace: true });
      } else {
        const updated = await adminNutritionLessonsApi.update(id!, payload);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-nutrition-lessons"] });
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
      const updated = await adminNutritionLessonsApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-nutrition-lessons"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Nutrition Lesson" : form.title}</h1>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Topic</label>
            <input
              value={form.topic ?? ""}
              onChange={(e) => update("topic", e.target.value)}
              placeholder="e.g. fiber, food-safety"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">XP reward</label>
            <input
              type="number"
              value={form.xpReward ?? 15}
              onChange={(e) => update("xpReward", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
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

        <div>
          <label className="text-sm font-semibold text-foreground/70">Lesson content</label>
          <textarea
            value={form.content ?? ""}
            onChange={(e) => update("content", e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <TagListInput
          label="Learning objectives"
          values={form.learningObjectives ?? []}
          onChange={(v) => update("learningObjectives", v)}
        />

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={includeQuiz} onChange={(e) => setIncludeQuiz(e.target.checked)} />
          Include a check-for-understanding quiz
        </label>

        {includeQuiz && (
          <JsonField
            label="Quiz"
            value={form.quiz ?? { questions: [] }}
            onChange={(v) => update("quiz", v as never)}
            hint='Same shape as a "quiz" gameType: { "questions": [{ "id", "prompt", "options": [{"id","text"}], "correctOptionId" }] }'
            rows={10}
          />
        )}

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
