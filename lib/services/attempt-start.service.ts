import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type PublicAnswer = { id: string; content: string; side: "left" | "right" | null };
export type PublicQuestion = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  answers: PublicAnswer[];
};

/**
 * Builds the question set shown to a student starting an attempt - answers
 * only expose `id`/`content`/`side`, never `is_correct`/`order_index`/
 * `match_group` (those would leak the correct answer). `ordering` questions
 * always get their options shuffled regardless of shuffleOptions, since
 * showing them in their stored (= correct) order would make the question
 * trivial.
 */
export async function buildAttemptQuestions(
  supabase: SupabaseClient,
  parentColumn: "quiz_id" | "exam_id",
  parentId: string,
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
): Promise<{ questions: PublicQuestion[]; randomizedOrder: unknown }> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, type, prompt, points, order_index, answers(id, content, side)")
    .eq(parentColumn, parentId)
    .order("order_index");
  if (error) throw error;

  let questions: PublicQuestion[] = (data ?? []).map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    answers:
      shuffleOptions || q.type === "ordering"
        ? shuffle(q.answers as PublicAnswer[])
        : (q.answers as PublicAnswer[]),
  }));

  if (shuffleQuestions) questions = shuffle(questions);

  const randomizedOrder = {
    question_ids: questions.map((q) => q.id),
    option_order: Object.fromEntries(questions.map((q) => [q.id, q.answers.map((a) => a.id)])),
  };

  return { questions, randomizedOrder };
}

export type RandomizedOrder = { question_ids: string[]; option_order: Record<string, string[]> };

/** Resuming an in-progress attempt must show the exact same order as when it
 * started, not re-shuffle - rebuilds from the order stored on the attempt row. */
export async function rebuildAttemptQuestions(
  supabase: SupabaseClient,
  parentColumn: "quiz_id" | "exam_id",
  parentId: string,
  randomizedOrder: RandomizedOrder,
): Promise<PublicQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, type, prompt, points, answers(id, content, side)")
    .eq(parentColumn, parentId);
  if (error) throw error;

  const questionsById = new Map((data ?? []).map((q) => [q.id, q]));

  return randomizedOrder.question_ids.flatMap((qid) => {
    const q = questionsById.get(qid);
    if (!q) return [];
    const answers = q.answers as PublicAnswer[];
    const answersById = new Map(answers.map((a) => [a.id, a]));
    const orderedAnswerIds = randomizedOrder.option_order[qid] ?? answers.map((a) => a.id);
    return [
      {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        answers: orderedAnswerIds.flatMap((aid) => {
          const a = answersById.get(aid);
          return a ? [a] : [];
        }),
      },
    ];
  });
}
