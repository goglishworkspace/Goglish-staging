import "server-only";
import type { CreateQuestionInput } from "@/lib/validation/question.schemas";

type AnswerInsert = {
  content: string;
  is_correct: boolean | null;
  order_index: number | null;
  side: "left" | "right" | null;
  match_group: string | null;
};

/** Translates the type-specific authoring payload into `answers` rows -
 * shared by /api/quizzes/[id]/questions and /api/exams/[id]/questions. */
export function buildAnswerRows(input: CreateQuestionInput): AnswerInsert[] {
  switch (input.type) {
    case "mcq":
      return input.options.map((o, index) => ({
        content: o.content,
        is_correct: o.is_correct,
        order_index: index,
        side: null,
        match_group: null,
      }));

    case "true_false":
      return [
        { content: "True", is_correct: input.correct_answer === true, order_index: 0, side: null, match_group: null },
        { content: "False", is_correct: input.correct_answer === false, order_index: 1, side: null, match_group: null },
      ];

    case "matching":
    case "drag_drop":
      return input.pairs.flatMap((pair, index) => [
        {
          content: pair.left,
          is_correct: null,
          order_index: null,
          side: "left" as const,
          match_group: `pair-${index}`,
        },
        {
          content: pair.right,
          is_correct: null,
          order_index: null,
          side: "right" as const,
          match_group: `pair-${index}`,
        },
      ]);

    case "ordering":
      return input.items.map((item, index) => ({
        content: item,
        is_correct: null,
        order_index: index,
        side: null,
        match_group: null,
      }));

    case "fill_blank":
      return input.accepted_answers.map((answer) => ({
        content: answer,
        is_correct: true,
        order_index: null,
        side: null,
        match_group: null,
      }));

    case "essay":
      return input.model_answer
        ? [{ content: input.model_answer, is_correct: null, order_index: null, side: null, match_group: null }]
        : [];
  }
}
