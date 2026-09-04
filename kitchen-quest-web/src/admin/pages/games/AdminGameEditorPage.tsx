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
import { adminGamesApi } from "../../api/adminGames";
import type { AdminGame } from "../../types/contentTypes";
import type { GameType } from "../../../types/api";

const GAME_TYPES: GameType[] = [
  "quiz",
  "matching",
  "sorting",
  "memory",
  "sequence",
  "dragAndDrop",
  "maze",
  "ingredientBuilder",
  "timedChallenge",
];

const CONFIG_HINTS: Record<GameType, string> = {
  quiz: '{ "questions": [{ "id", "prompt", "options": [{"id","text"}], "correctOptionId" }] }',
  matching: '{ "items": [{ "id", "promptLabel", "matchLabel" }] }',
  sorting: '{ "bins": [{"id","label"}], "items": [{"id","label","correctBinId"}] }',
  memory: '{ "pairs": [{"id","label"}], "parMoves"? }',
  sequence: '{ "steps": [{"id","label"}] } -- array order IS the correct order',
  dragAndDrop: '{ "slots": [{"id","order","label","correctItemId"}], "draggableItems": [{"id","label"}] }',
  maze: '{ "layoutKey", "collectibles": [{"id","label","isCorrectFood"}], "timeLimitSeconds"? }',
  ingredientBuilder: '{ "targetItems": [{"id","label"}], "distractorItems": [{"id","label"}] }',
  timedChallenge: '{ "timeLimitSeconds", "targetCorrectCount", "items": [{"id","label","isCorrect"}] }',
};

type FormState = Partial<AdminGame>;

const BLANK: FormState = {
  title: "",
  slug: "",
  gameType: "quiz",
  ageGroups: [],
  difficulty: "easy",
  description: "",
  learningObjectives: [],
  nutritionTopics: [],
  foodTopics: [],
  instructions: "",
  configuration: {},
  xpReward: 20,
  maxStars: 3,
  unlockRequirements: { type: "always" },
};

export function AdminGameEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-games", id],
    queryFn: () => adminGamesApi.getById(id!),
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
        const created = await adminGamesApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-games"] });
        navigate(`/admin/games/${created._id}`, { replace: true });
      } else {
        const updated = await adminGamesApi.update(id!, form);
        setForm(updated);
        await queryClient.invalidateQueries({ queryKey: ["admin-games"] });
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
      const updated = await adminGamesApi.transitionStatus(id, nextStatus);
      setForm(updated);
      await queryClient.invalidateQueries({ queryKey: ["admin-games"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  const gameType = (form.gameType ?? "quiz") as GameType;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Game" : form.title}</h1>
        {!isNew && form.status && <ContentStatusBadge status={form.status} />}
      </div>

      {!isNew && form.status && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Workflow</p>
          <WorkflowActions currentStatus={form.status} onTransition={handleTransition} />
          <p className="mt-3 text-xs text-neutral-400">
            Version {form.version} · Created by {form.createdBy ?? "—"} · Last updated by {form.updatedBy ?? "—"}
            {form.publishedAt && ` · Published ${new Date(form.publishedAt).toLocaleString()}`}
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground/70">Game type</label>
            <select
              value={gameType}
              onChange={(e) => update("gameType", e.target.value as never)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              {GAME_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">Difficulty</label>
            <select
              value={form.difficulty ?? "easy"}
              onChange={(e) => update("difficulty", e.target.value as never)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground/70">XP reward</label>
            <input
              type="number"
              value={form.xpReward ?? 20}
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
                  form.ageGroups?.includes(range as never)
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {range}
              </button>
            ))}
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
          <label className="text-sm font-semibold text-foreground/70">Instructions (shown to the child)</label>
          <textarea
            value={form.instructions ?? ""}
            onChange={(e) => update("instructions", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <TagListInput
          label="Learning objectives"
          values={form.learningObjectives ?? []}
          onChange={(v) => update("learningObjectives", v)}
        />
        <TagListInput
          label="Nutrition topics"
          values={form.nutritionTopics ?? []}
          onChange={(v) => update("nutritionTopics", v)}
        />
        <TagListInput label="Food topics" values={form.foodTopics ?? []} onChange={(v) => update("foodTopics", v)} />

        <JsonField
          label="Configuration"
          value={form.configuration}
          onChange={(v) => update("configuration", v as never)}
          hint={`Shape for "${gameType}": ${CONFIG_HINTS[gameType]}. Never includes the answer key when delivered to a child -- that's the backend's redaction layer, not something authored here.`}
          rows={12}
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
    </div>
  );
}
