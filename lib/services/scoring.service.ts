import "server-only";

export type QuestionType =
  | "mcq"
  | "true_false"
  | "matching"
  | "essay"
  | "ordering"
  | "fill_blank"
  | "drag_drop";

export type QuestionForScoring = { id: string; type: QuestionType; points: number };
export type AnswerForScoring = {
  id: string;
  content: string;
  is_correct: boolean | null;
  order_index: number | null;
  side: "left" | "right" | null;
  match_group: string | null;
};

export type ScoredResponse = { isCorrect: boolean | null; pointsAwarded: number };

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * All-or-nothing per question (no partial credit) - matches the spec's "لا
 * درجات سالبة" in spirit: every wrong/partial answer just scores 0, never
 * negative. Essay is never auto-scored (isCorrect stays null pending manual
 * grading, out of Phase 3's scope).
 */
export function scoreResponse(
  question: QuestionForScoring,
  answers: AnswerForScoring[],
  response: unknown,
): ScoredResponse {
  switch (question.type) {
    case "mcq":
    case "true_false": {
      const correct = answers.find((a) => a.is_correct);
      const isCorrect = typeof response === "string" && !!correct && response === correct.id;
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "fill_blank": {
      if (typeof response !== "string") return { isCorrect: false, pointsAwarded: 0 };
      const submitted = normalize(response);
      const isCorrect = answers.some((a) => normalize(a.content) === submitted);
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "ordering": {
      if (!Array.isArray(response) || !response.every((v) => typeof v === "string")) {
        return { isCorrect: false, pointsAwarded: 0 };
      }
      const correctOrder = [...answers]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((a) => a.id);
      const isCorrect =
        response.length === correctOrder.length &&
        response.every((id, index) => id === correctOrder[index]);
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "matching":
    case "drag_drop": {
      if (!Array.isArray(response)) return { isCorrect: false, pointsAwarded: 0 };
      const pairs = response as Array<{ left?: unknown; right?: unknown }>;
      const byId = new Map(answers.map((a) => [a.id, a]));
      const leftCount = answers.filter((a) => a.side === "left").length;
      const validPairs = pairs.filter(
        (p) => typeof p.left === "string" && typeof p.right === "string",
      );

      const isCorrect =
        leftCount > 0 &&
        validPairs.length === leftCount &&
        validPairs.every((p) => {
          const left = byId.get(p.left as string);
          const right = byId.get(p.right as string);
          return (
            left?.side === "left" &&
            right?.side === "right" &&
            !!left.match_group &&
            left.match_group === right.match_group
          );
        });
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "essay":
      return { isCorrect: null, pointsAwarded: 0 };

    default:
      return { isCorrect: false, pointsAwarded: 0 };
  }
}

export type AttemptScore = { scorePercent: number; passed: boolean };

export function scoreAttempt(
  questions: QuestionForScoring[],
  passingScorePercent: number,
  scoredResponses: ScoredResponse[],
): AttemptScore {
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = scoredResponses.reduce((sum, r) => sum + r.pointsAwarded, 0);
  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  return { scorePercent, passed: scorePercent >= passingScorePercent };
}
