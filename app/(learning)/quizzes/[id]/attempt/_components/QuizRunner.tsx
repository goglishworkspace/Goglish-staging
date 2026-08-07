"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QuestionRenderer, type ResponseValue } from "@/app/(learning)/_components/QuestionRenderer";
import { AttemptReview, AttemptNextAction, type ReviewedResponse } from "@/app/(learning)/_components/AttemptReview";
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

export function QuizRunner() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<"loading" | "taking" | "submitting" | "done" | "error">("loading");
  const [attempt, setAttempt] = useState<StartData | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
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

  if (!attempt) return null;

  return (
    <div className="flex flex-col gap-6">
      {remainingSeconds !== null && (
        <p className="text-sm font-semibold">
          الوقت المتبقي: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
        </p>
      )}
      {attempt.questions.map((q, index) => (
        <div key={q.id} className="rounded-xl border border-black/15 p-4 dark:border-white/15">
          <p className="mb-3 font-semibold">
            {index + 1}. {q.prompt}
          </p>
          <QuestionRenderer
            question={q}
            value={responses[q.id]}
            onChange={(v) => setResponses((prev) => ({ ...prev, [q.id]: v }))}
          />
        </div>
      ))}
      <button
        onClick={submit}
        disabled={state !== "taking"}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-secondary)] disabled:opacity-60"
      >
        تسليم
      </button>
    </div>
  );
}
