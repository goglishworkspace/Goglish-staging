"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QuestionRenderer, type ResponseValue } from "@/app/(learning)/_components/QuestionRenderer";
import { AttemptReview, AttemptNextAction, type ReviewedResponse } from "@/app/(learning)/_components/AttemptReview";
import type { PublicQuestion } from "@/lib/services/attempt-start.service";

type StartData = {
  already_submitted?: boolean;
  attempt_id: string;
  questions?: PublicQuestion[];
  time_limit_seconds?: number | null;
  started_at?: string;
};

type SubmitResult = { score_percent: number; passed: boolean; certificate_id: string | null };

type RunnerState = "loading" | "taking" | "submitting" | "done" | "already_submitted" | "error";

type ReviewData = { responses: ReviewedResponse[]; course_id: string | null };

export function ExamRunner() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<RunnerState>("loading");
  const [attempt, setAttempt] = useState<StartData | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const responsesRef = useRef(responses);
  const attemptIdRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const startRequestedRef = useRef(false);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    // React Strict Mode (default in Next.js dev) intentionally double-invokes
    // effects on mount to surface bugs like this - without this guard, two
    // near-simultaneous POSTs race the unique(exam_id, user_id) constraint
    // and the loser gets a generic 500 ("تعذر بدء المحاولة") instead of
    // silently resuming, which is what made this look intermittent.
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    fetch(`/api/exams/${id}/start`, { method: "POST" })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setErrorMessage(json.message);
          setState("error");
          return;
        }
        setAttempt(json.data);
        attemptIdRef.current = json.data.attempt_id;
        if (json.data.already_submitted) {
          submittedRef.current = true;
          setState("already_submitted");
          return;
        }
        if (json.data.time_limit_seconds) {
          const elapsed = Math.floor((Date.now() - new Date(json.data.started_at).getTime()) / 1000);
          setRemainingSeconds(Math.max(json.data.time_limit_seconds - elapsed, 0));
        }
        setState("taking");
      });
  }, [id]);

  const buildBody = useCallback(
    () => ({
      responses: Object.entries(responsesRef.current).map(([question_id, response]) => ({
        question_id,
        response,
      })),
    }),
    [],
  );

  // The deliberate "Submit" button click.
  const submit = useCallback(async () => {
    if (!attemptIdRef.current || submittedRef.current) return;
    submittedRef.current = true;
    setState("submitting");
    const res = await fetch(`/api/exam-attempts/${attemptIdRef.current}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody()),
    });
    const json = await res.json();
    if (!json.success) {
      setErrorMessage(json.message);
      setState("error");
      return;
    }
    setResult(json.data);
    setState("done");

    // Best-effort - the review (correct answers + back-to-course link) is a
    // nice addition to the done screen, not required to show pass/fail.
    fetch(`/api/exam-attempts/${attemptIdRef.current}`)
      .then((r) => r.json())
      .then((reviewJson) => {
        if (!reviewJson.success) return;
        setReview({
          responses: reviewJson.data.responses ?? [],
          course_id: reviewJson.data.course_id ?? null,
        });
      })
      .catch(() => {});
  }, [buildBody]);

  // Anti-cheat: leaving the tab (or the timer running out) force-submits
  // immediately, no second chances (Section 8 - "لا يخرج ويرجع"). Uses
  // sendBeacon so it still fires even as the page is unloading.
  const forceSubmit = useCallback(() => {
    if (!attemptIdRef.current || submittedRef.current) return;
    submittedRef.current = true;
    const body = JSON.stringify(buildBody());
    const sent = navigator.sendBeacon?.(
      `/api/exam-attempts/${attemptIdRef.current}/leave`,
      new Blob([body], { type: "application/json" }),
    );
    if (!sent) {
      fetch(`/api/exam-attempts/${attemptIdRef.current}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
    setResult(null);
    setState("done");
  }, [buildBody]);

  useEffect(() => {
    if (state !== "taking") return;

    const onVisibilityChange = () => {
      if (document.hidden) forceSubmit();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [state, forceSubmit]);

  useEffect(() => {
    if (remainingSeconds === null || state !== "taking") return;
    if (remainingSeconds <= 0) {
      // Deferred so the setState calls inside forceSubmit() don't run
      // synchronously within this effect's execution.
      const timeout = setTimeout(forceSubmit, 0);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => setRemainingSeconds((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [remainingSeconds, state, forceSubmit]);

  if (state === "loading") return <p>جاري تحميل الامتحان...</p>;
  if (state === "error") return <p className="text-red-600">{errorMessage}</p>;
  if (state === "already_submitted") {
    return <p>الامتحان ده اتسلّم بالفعل - محاولة واحدة بس مسموحة لكل امتحان.</p>;
  }

  if (state === "done") {
    if (!result) {
      return <p>تم تسليم الامتحان تلقائياً لأنك سبت الصفحة أو انتهى الوقت.</p>;
    }
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-black/15 p-6 text-center dark:border-white/15">
          <h2 className="mb-2 text-xl font-bold">{result.passed ? "مبروك، نجحت!" : "للأسف مانجحتش"}</h2>
          <p className="text-lg">درجتك: {result.score_percent}%</p>
        </div>

        {review && <AttemptReview responses={review.responses} />}

        {review && <AttemptNextAction kind="exam" courseId={review.course_id} />}
      </div>
    );
  }

  if (!attempt?.questions) return null;

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        تحذير: لو سبت الصفحة أو غيّرت التاب، الامتحان هيتسلّم تلقائياً فوراً - محاولة واحدة بس مسموحة.
      </p>
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
