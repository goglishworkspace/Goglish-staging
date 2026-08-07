/** Shared between quizzes.ts and exams.ts - question authoring is scoped to
 * MCQ and true/false only here (the schema supports 5 more exotic types:
 * matching/drag_drop/ordering/fill_blank/essay, out of scope for this
 * builder). Mirrors lib/validation/question.schemas.ts's mcq/trueFalseSchema. */
export type QuestionInput =
  | { type: "mcq"; prompt: string; order_index: number; options: { content: string; is_correct: boolean }[] }
  | { type: "true_false"; prompt: string; order_index: number; correct_answer: boolean };

export type QuestionAnswer = { id: string; content: string; is_correct: boolean | null; order_index: number | null };

export type Question = {
  id: string;
  type: "mcq" | "true_false" | "matching" | "essay" | "ordering" | "fill_blank" | "drag_drop";
  prompt: string;
  points: number;
  order_index: number;
  answers: QuestionAnswer[];
};
