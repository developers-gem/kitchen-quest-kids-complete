const NutritionLesson = require("./nutritionLesson.model");
const XPTransaction = require("../xp/xpTransaction.model");
const ApiError = require("../../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../../utils/pagination");
const { validateOutcome, scoreOutcome } = require("../games/gameType.schemas");
const { awardXp, recordActivity } = require("../gamification/gamification.service");
const { checkAndAwardAchievements } = require("../achievements/achievementEngine.service");
const { getFamilyTimezone } = require("../../utils/familyTimezone");
const { getOwnedChild } = require("../../utils/getOwnedChild");

/**
 * Closes a gap the codebase itself flagged honestly (see
 * utils/unlockRuleEngine.js's doc comment on
 * `nutritionQuestsCompletedAtLeast`): content management and admin CRUD
 * for nutrition lessons existed, but there was no child-facing way to
 * actually complete one. This module is that missing piece, wired
 * through the same central gamification engine every other completion
 * flow uses -- no parallel XP/streak/achievement logic invented here.
 *
 * A lesson's optional `quiz` field reuses the exact "quiz" gameType
 * scorer from games/gameType.schemas.js (per that field's own doc
 * comment) -- this service is the first real caller of that reuse.
 */
const REPLAY_XP_RATIO = 0.3;
const PASS_THRESHOLD = 0.5; // minimum quiz ratio to earn XP, when a quiz exists



async function listLessons(query = {}, { familyId } = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { status: "published" };
  if (query.ageRange) filter.ageGroups = query.ageRange;
  if (query.topic) filter.topic = query.topic;

  const [lessons, total] = await Promise.all([
    NutritionLesson.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
    NutritionLesson.countDocuments(filter),
  ]);

  let child = null;
  if (query.childId && familyId) {
    child = await getOwnedChild(query.childId, familyId).catch(() => null);
  }

  const data = await Promise.all(
    lessons.map(async (lesson) => {
      const base = {
        _id: lesson._id,
        title: lesson.title,
        slug: lesson.slug,
        topic: lesson.topic,
        ageGroups: lesson.ageGroups,
        xpReward: lesson.xpReward,
        hasQuiz: Boolean(lesson.quiz),
      };
      if (!child) return base;
      const completions = await XPTransaction.countDocuments({
        childProfile: child._id,
        sourceType: "lesson",
        sourceId: lesson._id,
      });
      return { ...base, completed: completions > 0 };
    })
  );

  return { data, meta: buildPaginationMeta({ page, limit, total }) };
}

async function getBySlug(slug) {
  const lesson = await NutritionLesson.findOne({ slug, status: "published" });
  if (!lesson) throw ApiError.notFound("Nutrition lesson not found");
  return {
    _id: lesson._id,
    title: lesson.title,
    slug: lesson.slug,
    topic: lesson.topic,
    content: lesson.content,
    media: lesson.media,
    learningObjectives: lesson.learningObjectives,
    xpReward: lesson.xpReward,
    // Same redaction principle as a "quiz" gameType's configuration --
    // never ship the answer key.
    quiz: lesson.quiz
      ? { questions: lesson.quiz.questions.map(({ correctOptionId, ...rest }) => rest) }
      : undefined,
  };
}

/**
 * Completes a lesson. If it has a quiz, the child's answers are scored
 * server-side against the stored answer key (never trusting a
 * client-submitted score, same anti-cheat posture as games) using the
 * shared quiz scorer. XP is awarded only if the score clears
 * PASS_THRESHOLD (or unconditionally if there's no quiz -- reading the
 * lesson content itself is the "activity"). First completion earns the
 * full reward; replays earn a reduced amount, mirroring games/recipes.
 */
async function completeLesson(lessonId, childId, familyId, { answers } = {}) {
  const child = await getOwnedChild(childId, familyId);
  const lesson = await NutritionLesson.findOne({ _id: lessonId, status: "published" });
  if (!lesson) throw ApiError.notFound("Nutrition lesson not found");

  let ratio = 1;
  let quizResult = null;
  if (lesson.quiz) {
    const validated = validateOutcome("quiz", { answers: answers || [] });
    const scored = scoreOutcome("quiz", lesson.quiz, validated);
    ratio = scored.ratio;
    quizResult = { correct: scored.correct, total: scored.total };
  }

  const priorCompletions = await XPTransaction.countDocuments({
    childProfile: child._id,
    sourceType: "lesson",
    sourceId: lesson._id,
  });
  const isFirstCompletion = priorCompletions === 0;
  const passed = ratio >= PASS_THRESHOLD;

  let xpEarned = 0;
  if (passed) {
    xpEarned = isFirstCompletion ? lesson.xpReward : Math.round(lesson.xpReward * REPLAY_XP_RATIO);
  }

  if (xpEarned > 0) {
    await awardXp({
      child,
      sourceType: "lesson",
      sourceId: lesson._id,
      amount: xpEarned,
      reason: `Completed nutrition lesson "${lesson.title}"${isFirstCompletion ? "" : " (again)"}`,
      metadata: { quizResult, isFirstCompletion },
    });

    const timezone = await getFamilyTimezone(familyId);
    await recordActivity(child, timezone);

    if (isFirstCompletion) {
      child.progressStats.nutritionQuestsCompleted += 1;
    }
    await child.save();
  }

  const newlyEarnedAchievements = await checkAndAwardAchievements(child);
  await child.save();

  return {
    lessonId: lesson._id,
    passed,
    quizResult,
    xpEarned,
    isFirstCompletion,
    child: { totalXP: child.totalXP, currentLevel: child.currentLevel },
    newlyEarnedAchievements,
  };
}

module.exports = { listLessons, getBySlug, completeLesson };
