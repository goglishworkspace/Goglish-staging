"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useModuleLessons } from "@/lib/api/queries/modules";

export type CorrectAnswerSummary =
  | { kind: "choice"; correct: string }
  | { kind: "text"; correct: string[] }
  | { kind: "ordered_list"; correct: string[] }
  | { kind: "pairs"; correct: Array<{ left: string; right: string }> }
  | { kind: "manual" };

export type ReviewedResponse = {
  question_id: string;
  is_correct: boolean | null;
  prompt: string;
  correct_answer: CorrectAnswerSummary | null;
};

function CorrectAnswerText({ summary }: { summary: CorrectAnswerSummary }) {
  switch (summary.kind) {
    case "choice":
      return <>{summary.correct}</>;
    case "text":
      return <>{summary.correct.join(" / ")}</>;
    case "ordered_list":
      return <>{summary.correct.map((c, i) => `${i + 1}. ${c}`).join("، ")}</>;
    case "pairs":
      return <>{summary.correct.map((p) => `${p.left} ↔ ${p.right}`).join("، ")}</>;
    case "manual":
      return <>هيتصحح يدويًا من المدرس</>;
  }
}

/** Under every question the student got wrong, shows what the correct
 * answer was - never for essay (manually graded) or already-correct ones. */
export function AttemptReview({ responses }: { responses: ReviewedResponse[] }) {
  const wrong = responses.filter((r) => r.is_correct === false && r.correct_answer && r.correct_answer.kind !== "manual");
  if (!wrong.length) return null;

  return (
    <div className="flex w-full flex-col gap-3 text-start">
      <h3 className="text-base font-semibold">مراجعة الإجابات</h3>
      {wrong.map((r) => (
        <div
          key={r.question_id}
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/50 dark:bg-red-950/30"
        >
          <p className="font-medium">{r.prompt}</p>
          <p className="mt-1 flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-4 shrink-0" />
            الإجابة الصح: <CorrectAnswerText summary={r.correct_answer!} />
          </p>
        </div>
      ))}
    </div>
  );
}

/** "زرار يرجعه لصفحة الكورس، أو لو تدريب يوديه للدرس اللي بعده" - a quiz
 * goes to the next lesson in the same module when there is one, otherwise
 * (and an exam always) falls back to the course page. */
export function AttemptNextAction({
  kind,
  courseId,
  moduleId,
  lessonId,
}: {
  kind: "quiz" | "exam";
  courseId: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
}) {
  const { data: lessons } = useModuleLessons(kind === "quiz" ? (moduleId ?? "") : "");
  const currentIndex = lessons?.findIndex((l) => l.id === lessonId) ?? -1;
  const nextLesson = kind === "quiz" && currentIndex >= 0 ? lessons?.[currentIndex + 1] : undefined;

  if (nextLesson) {
    return (
      <Link
        href={`/lessons/${nextLesson.id}`}
        className="inline-flex w-fit rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-secondary)]"
      >
        الدرس التالي
      </Link>
    );
  }

  if (!courseId) return null;
  return (
    <Link
      href={`/courses/${courseId}`}
      className="inline-flex w-fit rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-secondary)]"
    >
      الرجوع لصفحة الكورس
    </Link>
  );
}
