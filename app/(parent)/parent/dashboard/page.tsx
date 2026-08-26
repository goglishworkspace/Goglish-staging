"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, CreditCard, Star, Trophy, UserPlus, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useLinkedChildren,
  useChildOverview,
  useChildNotifications,
  useLinkChildByNationalId,
  getQuizResultTitle,
} from "@/lib/api/queries/parent";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function AddChildForm() {
  const [identifier, setIdentifier] = useState("");
  const linkChild = useLinkChildByNationalId();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linkChild.mutate(identifier.trim(), {
      onSuccess: (data) => {
        toast.success(
          data.status === "approved" ? "تم ربط الطالب بحسابك" : "تم إرسال طلب الربط - في انتظار موافقة الطالب",
        );
        setIdentifier("");
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر ربط الطالب")),
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-wrap items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="child-identifier" className="text-caption text-muted-foreground">
          رقم هاتف الطالب المسجل به في المنصة
        </label>
        <Input
          id="child-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="01012345678"
          dir="ltr"
        />
      </div>
      <Button type="submit" disabled={linkChild.isPending || identifier.trim().length === 0}>
        <UserPlus className="size-4" />
        إضافة ابن/ابنة
      </Button>
    </form>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
          <Icon className="size-5 text-primary" />
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

function normalizeOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function ParentOverviewPage() {
  const { data: children, isLoading: childrenLoading } = useLinkedChildren();
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  // No effect needed to seed the initial selection - default to the first
  // *approved* child (a pending one has no overview data to show yet - the
  // request is still waiting on the student), only overridden once the
  // parent clicks another approved child.
  const selectedId =
    manualSelectedId ?? children?.find((c) => c.status === "approved")?.student_id ?? null;

  const { data: overview, isLoading: overviewLoading } = useChildOverview(selectedId ?? "");
  const { data: notifications, isLoading: notificationsLoading } = useChildNotifications(selectedId ?? "");

  if (childrenLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!children?.length) {
    return (
      <div className="flex w-full flex-col gap-6">
        <h1 className="text-h2 text-secondary dark:text-white">بوابة ولي الأمر</h1>
        <Card className="w-full">
          <CardContent className="flex w-full flex-col gap-3 p-5">
            <h2 className="text-h3 text-secondary dark:text-white">أبنائي</h2>
            <p className="text-small text-muted-foreground">مفيش أبناء مرتبطين بحسابك حالياً. اربط ابنك بالرقم القومي بتاعه.</p>
            <AddChildForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">بوابة ولي الأمر</h1>

      <Card className="w-full">
        <CardContent className="flex w-full flex-col gap-3 p-5">
          <h2 className="text-h3 text-secondary dark:text-white">أبنائي</h2>
          <div className="flex w-full flex-wrap gap-2">
          {children.map((child) => {
            const pending = child.status === "pending";
            const rejected = child.status === "rejected";
            const unselectable = pending || rejected;
            return (
              <button
                key={child.student_id}
                type="button"
                disabled={unselectable}
                onClick={() => setManualSelectedId(child.student_id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-small font-medium transition-colors",
                  unselectable
                    ? "cursor-not-allowed bg-transparent text-muted-foreground"
                    : selectedId === child.student_id
                      ? "bg-primary text-secondary"
                      : "bg-transparent text-foreground hover:bg-muted",
                )}
              >
                {child.first_name} {child.last_name}
                {pending && (
                  <Badge variant="outline" className="text-caption">
                    قيد موافقة الطالب
                  </Badge>
                )}
                {rejected && (
                  <Badge variant="destructive" className="text-caption">
                    الطلب اتفض
                  </Badge>
                )}
              </button>
            );
          })}
          </div>
          <AddChildForm />
        </CardContent>
      </Card>

      {overviewLoading && (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!overviewLoading && overview && (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="نسبة التقدم في الكورسات" icon={Trophy}>
            {!overview.courses.length ? (
              <p className="text-small text-muted-foreground">مش مشترك في أي كورس لسه.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {overview.courses.map((c) => (
                  <li key={c.course_id}>
                    <div className="mb-1 flex items-center justify-between text-small">
                      <span className="font-medium text-foreground">{c.course_title}</span>
                      <span className="text-muted-foreground">
                        {c.completed_lessons}/{c.total_lessons} - {c.completion_percent}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${c.completion_percent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-caption text-muted-foreground">
              XP: {overview.gamification.xp_total} - الترتيب العام: {overview.gamification.global_rank ?? "-"} - آخر دخول:{" "}
              {overview.last_login_at ? new Date(overview.last_login_at).toLocaleString("ar-EG") : "-"}
            </p>
          </SectionCard>

          <SectionCard title="الدرجات ونتائج الاختبارات" icon={Star}>
            {!overview.quiz_results.length && !overview.exam_results.length ? (
              <p className="text-small text-muted-foreground">مفيش نتائج لسه.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.quiz_results.slice(0, 5).map((q) => (
                  <li key={q.id} className="flex items-center justify-between text-small">
                    <span className="truncate text-foreground">{getQuizResultTitle(q)}</span>
                    <Badge variant={q.passed ? "default" : "destructive"}>{q.score_percent}%</Badge>
                  </li>
                ))}
                {overview.exam_results.slice(0, 5).map((examResult) => {
                  const exam = normalizeOne(examResult.exams);
                  return (
                    <li key={examResult.id} className="flex items-center justify-between text-small">
                      <span className="truncate text-foreground">{exam?.title}</span>
                      <Badge variant={examResult.passed ? "default" : "destructive"}>{examResult.score_percent}%</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="الأحداث القادمة" icon={Video}>
            {!overview.upcoming_exams.length ? (
              <p className="text-small text-muted-foreground">مفيش أحداث قادمة.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.upcoming_exams.map((exam) => (
                  <li key={exam.id} className="flex items-center justify-between text-small">
                    <span className="truncate text-foreground">{exam.title}</span>
                    <Badge variant="outline">امتحان</Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="حالة الاشتراك" icon={CreditCard}>
            {!overview.subscription ? (
              <p className="text-small text-muted-foreground">لا يوجد اشتراك نشط.</p>
            ) : (
              <div className="flex flex-col gap-1 text-small">
                <p className="text-foreground">{normalizeOne(overview.subscription.subscription_plans)?.name}</p>
                <p className="text-muted-foreground">
                  ينتهي في {new Date(overview.subscription.current_period_end).toLocaleDateString("ar-EG")}
                </p>
                <Badge variant={overview.subscription.status === "active" ? "default" : "outline"} className="w-fit">
                  {overview.subscription.status}
                </Badge>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <SectionCard title="الإشعارات" icon={Bell}>
        {notificationsLoading && <Skeleton className="h-16 w-full" />}
        {!notificationsLoading && !notifications?.length && (
          <p className="text-small text-muted-foreground">مفيش إشعارات لسه.</p>
        )}
        {!notificationsLoading && !!notifications?.length && (
          <ul className="flex flex-col gap-2">
            {notifications.slice(0, 10).map((n) => (
              <li key={n.id} className="rounded-lg bg-muted/50 p-3">
                <p className="text-small font-medium text-foreground">{n.title}</p>
                <p className="text-caption text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <p className="text-caption text-muted-foreground">
        محتاج تفاصيل أكتر؟ <Link href="/" className="text-primary underline">تصفح المنصة</Link>
      </p>
    </div>
  );
}
