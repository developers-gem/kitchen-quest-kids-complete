import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getErrorMessage } from "../../../lib/errors";
import { ContentStatusBadge } from "../../components/ContentStatusBadge";
import { WorkflowActions } from "../../components/WorkflowActions";
import { adminDailyChallengesApi } from "../../api/adminDailyChallenges";
import { AGE_RANGES } from "../../../types/api";
import type { AdminDailyChallenge } from "../../types/contentTypes";

type FormState = Partial<AdminDailyChallenge>;

const CHALLENGE_TYPES: AdminDailyChallenge["challengeType"][] = [
  "completeAnyGame",
  "completeSpecificGame",
  "completeAnyRecipe",
  "completeSpecificRecipe",
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
function inOneWeekIsoDate(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const BLANK: FormState = {
  title: "",
  description: "",
  challengeType: "completeAnyGame",
  target: { count: 1 },
  xpReward: 25,
  dateRange: { startDate: todayIsoDate(), endDate: inOneWeekIsoDate() },
  applicableAgeGroups: [...AGE_RANGES],
};

/** True for the two challengeTypes whose target needs a specific
 * game/recipe id, not just a count -- mirrors
 * adminDailyChallenges.validation.js's targetSchema exactly (gameId/
 * recipeId are both optional there since only one applies depending on
 * challengeType, validated together with challengeType server-side). */
function needsSpecificId(challengeType?: AdminDailyChallenge["challengeType"]) {
  return challengeType === "completeSpecificGame" || challengeType === "completeSpecificRecipe";
}

export function AdminDailyChallengeEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError, error } = useQuery({
    queryKey: ["admin-daily-challenges", id],
    queryFn: () => adminDailyChallengesApi.getById(id!),
    enabled: !isNew,
  });

  const [form, setForm] = useState<FormState>(BLANK);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        ...existing,
        dateRange: {
          startDate: existing.dateRange.startDate.slice(0, 10),
          endDate: existing.dateRange.endDate.slice(0, 10),
        },
      });
    }
  }, [existing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAgeGroup(range: (typeof AGE_RANGES)[number]) {
    const current = form.applicableAgeGroups ?? [];
    update(
      "applicableAgeGroups",
      current.includes(range) ? current.filter((r) => r !== range) : [...current, range]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      if (isNew) {
        const created = await adminDailyChallengesApi.create(form);
        await queryClient.invalidateQueries({ queryKey: ["admin-daily-challenges"] });
        navigate(`/admin/daily-challenges/${created._id}`, { replace: true });
      } else {
        const updated = await adminDailyChallengesApi.update(id!, form);
        setForm({
          ...updated,
          dateRange: { startDate: updated.dateRange.startDate.slice(0, 10), endDate: updated.dateRange.endDate.slice(0, 10) },
        });
        await queryClient.invalidateQueries({ queryKey: ["admin-daily-challenges"] });
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
      const updated = await adminDailyChallengesApi.transitionStatus(id, nextStatus);
      setForm({
        ...updated,
        dateRange: { startDate: updated.dateRange.startDate.slice(0, 10), endDate: updated.dateRange.endDate.slice(0, 10) },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-daily-challenges"] });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (!isNew && isLoading) return <LoadingState />;
  if (!isNew && isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{isNew ? "New Daily Challenge" : form.title}</h1>
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
          <label htmlFor="dc-title" className="text-sm font-semibold text-foreground/70">
            Title
          </label>
          <input
            id="dc-title"
            value={form.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="dc-description" className="text-sm font-semibold text-foreground/70">
            Description (optional)
          </label>
          <textarea
            id="dc-description"
            value={form.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dc-challenge-type" className="text-sm font-semibold text-foreground/70">
              Challenge type
            </label>
            <select
              id="dc-challenge-type"
              value={form.challengeType ?? "completeAnyGame"}
              onChange={(e) => {
                const challengeType = e.target.value as AdminDailyChallenge["challengeType"];
                // Dropping the previous gameId/recipeId when switching
                // away from a "specific" type -- an admin picking
                // "completeAnyGame" after having entered a gameId
                // shouldn't silently submit a now-irrelevant id.
                update("challengeType", challengeType);
                update("target", { count: form.target?.count ?? 1 });
              }}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              {CHALLENGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dc-xp-reward" className="text-sm font-semibold text-foreground/70">
              XP reward
            </label>
            <input
              id="dc-xp-reward"
              type="number"
              value={form.xpReward ?? 25}
              onChange={(e) => update("xpReward", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dc-count" className="text-sm font-semibold text-foreground/70">
              Count needed{needsSpecificId(form.challengeType) ? "" : " (any matching activity)"}
            </label>
            <input
              id="dc-count"
              type="number"
              min={1}
              value={form.target?.count ?? 1}
              onChange={(e) => update("target", { ...form.target, count: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          {needsSpecificId(form.challengeType) && (
            <div>
              <label htmlFor="dc-specific-id" className="text-sm font-semibold text-foreground/70">
                {form.challengeType === "completeSpecificGame" ? "Game ID" : "Recipe ID"}
              </label>
              <input
                id="dc-specific-id"
                value={
                  form.challengeType === "completeSpecificGame" ? (form.target?.gameId ?? "") : (form.target?.recipeId ?? "")
                }
                onChange={(e) =>
                  update("target", {
                    ...form.target,
                    count: form.target?.count ?? 1,
                    [form.challengeType === "completeSpecificGame" ? "gameId" : "recipeId"]: e.target.value,
                  })
                }
                placeholder="Paste the game or recipe's _id"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dc-start-date" className="text-sm font-semibold text-foreground/70">
              Start date
            </label>
            <input
              id="dc-start-date"
              type="date"
              value={form.dateRange?.startDate ?? todayIsoDate()}
              onChange={(e) => update("dateRange", { ...form.dateRange!, startDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="dc-end-date" className="text-sm font-semibold text-foreground/70">
              End date
            </label>
            <input
              id="dc-end-date"
              type="date"
              value={form.dateRange?.endDate ?? inOneWeekIsoDate()}
              onChange={(e) => update("dateRange", { ...form.dateRange!, endDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground/70">Applicable age groups</label>
          <div className="mt-1 flex gap-2">
            {AGE_RANGES.map((range) => {
              const selected = (form.applicableAgeGroups ?? []).includes(range);
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => toggleAgeGroup(range)}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
                    selected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {range}
                </button>
              );
            })}
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
