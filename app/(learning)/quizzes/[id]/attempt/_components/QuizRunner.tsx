"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QuestionRenderer, type ResponseValue } from "@/app/(learning)/_components/QuestionRenderer";
import { AttemptReview, AttemptNextAction, type ReviewedResponse } from "@/app/(learning)/_components/AttemptReview";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/lib/services/attempt-start.service";

type StartData = {
  attempt_id: string;
  questions: PublicQuestion[];
  time_limit_seconds: number | null;
  started_at: string;
};

type SubmitResult = { score_percent: number; passed: boolean };

type ReviewData = {
  responses: ReviewedResponse[];
  lesson_id: string | null;
  module_id: string | null;
  course_id: string | null;
};

type CheckResult = { is_correct: boolean | null; hint: string | null };

export function QuizRunner() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<"loading" | "taking" | "submitting" | "done" | "error">("loading");
  const [attempt, setAttempt] = useState<StartData | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checkedResults, setCheckedResults] = useState<Record<string, CheckResult>>({});
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const startRequestedRef = useRef(false);

  useEffect(() => {
    // See ExamRunner.tsx's identical guard - React Strict Mode double-invokes
    // this effect in dev, and without the guard the second POST races the
    // unique(quiz_id, user_id, attempt_number) constraint.
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    fetch(`/api/quizzes/${id}/start`, { method: "POST" })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setErrorMessage(json.message);
          setState("error");
          return;
        }
        setAttempt(json.data);
        if (json.data.time_limit_seconds) {
          const elapsed = Math.floor((Date.now() - new Date(json.data.started_at).getTime()) / 1000);
          setRemainingSeconds(Math.max(json.data.time_limit_seconds - elapsed, 0));
        }
        setState("taking");
      });
  }, [id]);

  const submit = useCallback(async () => {
    if (!attempt) return;
    setState("submitting");
    const body = {
      responses: Object.entries(responses).map(([question_id, response]) => ({ question_id, response })),
    };
    const res = await fetch(`/api/quiz-attempts/${attempt.attempt_id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      setErrorMessage(json.message);
      setState("error");
      return;
    }
    setResult(json.data);
    setState("done");

    // Best-effort - the review (correct answers + next-lesson link) is a nice
    // addition to the done screen, not required to show the pass/fail result.
    fetch(`/api/quiz-attempts/${attempt.attempt_id}`)
      .then((r) => r.json())
      .then((reviewJson) => {
        if (!reviewJson.success) return;
        setReview({
          responses: reviewJson.data.responses ?? [],
          lesson_id: reviewJson.data.lesson_id ?? null,
          module_id: reviewJson.data.module_id ?? null,
          course_id: reviewJson.data.course_id ?? null,
        });
      })
      .catch(() => {});
  }, [attempt, responses]);

  useEffect(() => {
    if (remainingSeconds === null || state !== "taking") return;
    if (remainingSeconds <= 0) {
      // Deferred so the setState calls inside submit() don't run
      // synchronously within this effect's execution.
      const timeout = setTimeout(submit, 0);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => setRemainingSeconds((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [remainingSeconds, state, submit]);

  const currentQuestion = attempt?.questions[currentIndex] ?? null;
  const currentCheck = currentQuestion ? checkedResults[currentQuestion.id] : undefined;
  const isLastQuestion = !!attempt && currentIndex === attempt.questions.length - 1;

  const onPrimaryAction = async () => {
    if (!attempt || !currentQuestion) return;

    // Phase 1: not checked yet - check this question's answer and show
    // feedback in place, without moving on.
    if (!currentCheck) {
      setChecking(true);
      try {
        const res = await fetch(
          `/api/quiz-attempts/${attempt.attempt_id}/questions/${currentQuestion.id}/check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response: responses[currentQuestion.id] ?? "" }),
          },
        );
        const json = await res.json();
        if (json.success) {
          setCheckedResults((prev) => ({ ...prev, [currentQuestion.id]: json.data }));
        }
      } finally {
        setChecking(false);
      }
      return;
    }

    // Phase 2: already checked - move on, or submit if this was the last one.
    if (isLastQuestion) {
      submit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (state === "loading") return <p>جاري تحميل الكويز...</p>;
  if (state === "error") return <p className="text-red-600">{errorMessage}</p>;

  if (state === "done" && result) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-black/15 p-6 text-center dark:border-white/15">
          <h2 className="mb-2 text-xl font-bold">{result.passed ? "مبروك، نجحت!" : "للأسف مانجحتش"}</h2>
          <p className="text-lg">درجتك: {result.score_percent}%</p>
        </div>

        {review && <AttemptReview responses={review.responses} />}

        {review && (
          <AttemptNextAction
            kind="quiz"
            courseId={review.course_id}
            moduleId={review.module_id}
            lessonId={review.lesson_id}
          />
        )}
      </div>
    );
  }

  if (!attempt || !currentQuestion) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          سؤال {currentIndex + 1} من {attempt.questions.length}
        </span>
        {remainingSeconds !== null && (
          <span className="font-semibold">
            الوقت المتبقي: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-black/15 p-4 dark:border-white/15">
        <p className="mb-3 font-semibold">
          {currentIndex + 1}. {currentQuestion.prompt}
        </p>
        <QuestionRenderer
          question={currentQuestion}
          value={responses[currentQuestion.id]}
          onChange={(v) => setResponses((prev) => ({ ...prev, [currentQuestion.id]: v }))}
          disabled={!!currentCheck}
        />

        {currentCheck && currentCheck.is_correct !== null && (
          <div
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-sm font-semibold",
              currentCheck.is_correct
                ? "border-success bg-success/10 text-success"
                : "border-destructive bg-destructive/10 text-destructive",
            )}
          >
            {currentCheck.is_correct ? "إجابة صحيحة! 🎉" : "إجابة غلط"}
            {currentCheck.hint && (
              <p className="mt-1 text-xs font-normal opacity-90">تلميح: {currentCheck.hint}</p>
            )}
          </div>
        )}

        {currentCheck && currentCheck.is_correct === null && (
          <div className="mt-3 rounded-lg border border-black/15 bg-black/[0.03] px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5">
            السؤال ده هيتقيّم يدوي من المدرّس.
          </div>
        )}
      </div>

      <button
        onClick={onPrimaryAction}
        disabled={checking || state !== "taking"}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-secondary)] disabled:opacity-60"
      >
        {checking
          ? "جاري التحقق..."
          : !currentCheck
            ? "تحقق من الإجابة"
            : isLastQuestion
              ? "تسليم"
              : "السؤال التالي"}
      </button>
    </div>
  );
}
