"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QuestionRenderer, type ResponseValue } from "@/app/(learning)/_components/QuestionRenderer";
import { AttemptReview, AttemptNextAction, type ReviewedResponse } from "@/app/(learning)/_components/AttemptReview";
import type { PublicQuestion } from "@/lib/services/attempt-start.service";
import { AlertTriangle } from "lucide-react";

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
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const responsesRef = useRef(responses);
  const attemptIdRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const startRequestedRef = useRef(false);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (document.hidden) {
        // UX-006: 10-second grace period before forced submission
        if (graceTimerRef.current) return;
        let remaining = 10;
        setGraceSecondsLeft(remaining);
        graceTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            if (graceTimerRef.current) {
              clearInterval(graceTimerRef.current);
              graceTimerRef.current = null;
            }
            setGraceSecondsLeft(null);
            forceSubmit();
          } else {
            setGraceSecondsLeft(remaining);
          }
        }, 1000);
      } else {
        // Returned to tab before grace period expired
        if (graceTimerRef.current) {
          clearInterval(graceTimerRef.current);
          graceTimerRef.current = null;
        }
        setGraceSecondsLeft(null);
      }
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
      if (graceTimerRef.current) {
        clearInterval(graceTimerRef.current);
        graceTimerRef.current = null;
      }
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

  const totalQuestions = attempt.questions.length;
  const answeredCount = attempt.questions.filter((q) => {
    const val = responses[q.id];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* UX-006: Grace Period Warning Modal */}
      {graceSecondsLeft !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-destructive bg-card p-6 text-center shadow-2xl animate-in fade-in">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-9 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-foreground">تحذير: لقد غادرت شاشة الامتحان!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              يرجى العودة فوراً إلى نافذة الامتحان. سيتم التسليم التلقائي وإنهاء المحاولة خلال:
            </p>
            <div className="my-4 text-5xl font-black text-destructive">
              {graceSecondsLeft}
            </div>
            <p className="text-xs text-muted-foreground">
              العودة إلى التاب ستلغي التسليم التلقائي وتسمح لك بإكمال الامتحان.
            </p>
          </div>
        </div>
      )}

      {/* UX-007: Submit Confirmation Dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-xl font-bold text-foreground">تأكيد تسليم الامتحان</h3>
            <div className="my-5 space-y-2.5 text-sm">
              <div className="flex justify-between rounded-xl bg-muted/50 p-3">
                <span className="text-muted-foreground">إجمالي الأسئلة:</span>
                <span className="font-bold">{totalQuestions}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-green-500/10 p-3 text-green-700 dark:text-green-400">
                <span>الأسئلة التي تم حلها:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              {unansweredCount > 0 ? (
                <div className="flex justify-between rounded-xl bg-destructive/10 p-3 text-destructive font-medium">
                  <span>أسئلة لم تقم بحلها:</span>
                  <span className="font-bold">{unansweredCount}</span>
                </div>
              ) : (
                <div className="rounded-xl bg-primary/10 p-2.5 text-center text-xs font-semibold text-primary">
                  ممتاز! قمت بالإجابة على جميع الأسئلة 🎉
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              تنبيه: بعد الضغط على تأكيد لن تتمكن من تعديل أي إجابة.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted cursor-pointer transition-colors"
              >
                العودة للحل
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSubmit(false);
                  submit();
                }}
                disabled={state === "submitting"}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md transition-all"
              >
                تأكيد التسليم
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
        تنبيه: مغادرة شاشة الامتحان تمنحك مهلة 10 ثوانٍ فقط للعودة قبل التسليم التلقائي - محاولة واحدة فقط مسموحة لكل امتحان.
      </p>
      {remainingSeconds !== null && (
        <p className="text-sm font-semibold">
          الوقت المتبقي: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
        </p>
      )}
      {attempt.questions.map((q, index) => (
        <div key={q.id} className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <p className="mb-3 font-semibold text-foreground">
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
        onClick={() => setShowConfirmSubmit(true)}
        disabled={state !== "taking"}
        className="rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-60 cursor-pointer transition-all"
      >
        تسليم الامتحان
      </button>
    </div>
  );
}
