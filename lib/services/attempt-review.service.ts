import "server-only";
import type { QuestionType } from "./scoring.service";

type AnswerRow = {
  id: string;
  content: string;
  is_correct: boolean | null;
  order_index: number | null;
  side: "left" | "right" | null;
  match_group: string | null;
};

export type CorrectAnswerSummary =
  | { kind: "choice"; correct: string }
  | { kind: "text"; correct: string[] }
  | { kind: "ordered_list"; correct: string[] }
  | { kind: "pairs"; correct: Array<{ left: string; right: string }> }
  | { kind: "manual" };

/** Post-submission only (see attempt-scoring.service.ts for the live scoring
 * logic this mirrors) - turns the raw answer key into a display-ready
 * "what was the correct answer" summary per question type, so the review
 * screen never has to ship raw is_correct flags for every option to the
 * client, just the one correct value it needs to render. */
export function buildCorrectAnswerSummary(type: QuestionType, answers: AnswerRow[]): CorrectAnswerSummary {
  switch (type) {
    case "mcq":
    case "true_false": {
      const correct = answers.find((a) => a.is_correct);
      return { kind: "choice", correct: correct?.content ?? "" };
    }

    case "fill_blank":
      return { kind: "text", correct: answers.map((a) => a.content) };

    case "ordering":
      return {
        kind: "ordered_list",
        correct: [...answers].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((a) => a.content),
      };

    case "matching":
    case "drag_drop": {
      const left = answers.filter((a) => a.side === "left");
      const right = answers.filter((a) => a.side === "right");
      const pairs = left
        .map((l) => {
          const match = right.find((r) => l.match_group && r.match_group === l.match_group);
          return match ? { left: l.content, right: match.content } : null;
        })
        .filter((p): p is { left: string; right: string } => !!p);
      return { kind: "pairs", correct: pairs };
    }

    case "essay":
    default:
      return { kind: "manual" };
  }
}
