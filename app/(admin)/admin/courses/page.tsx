"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContentStatusBadge } from "@/components/shared/ContentStatusBadge";
import {
  useAllCourses,
  useReviewCourse,
  usePendingLessons,
  useReviewLesson,
  useCourseEnrollmentCounts,
  getPendingLessonContext,
  type PendingLesson,
} from "@/lib/api/queries/admin-content";
import { useDeleteCourse, type Course } from "@/lib/api/queries/courses";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function DeleteCourseRow({ course, onDone }: { course: Course; onDone: () => void }) {
  const deleteCourse = useDeleteCourse();

  const onConfirmDelete = () => {
    deleteCourse.mutate(course.id, {
      onSuccess: () => {
        toast.success("تم حذف الكورس");
        onDone();
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الكورس")),
    });
  };

  return (
    <TableRow>
      <TableCell colSpan={5}>
        <div className="flex w-full flex-col gap-2 rounded-lg bg-destructive/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-foreground">متأكد إنك عايز تحذف كورس &quot;{course.title}&quot;؟ الطلاب اللي مشتركين فيه هيفقدوا الوصول.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDone}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={deleteCourse.isPending} onClick={onConfirmDelete}>
              تأكيد الحذف
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RejectCourseRow({ course, onDone }: { course: Course; onDone: () => void }) {
  const reviewCourse = useReviewCourse();
  const [reason, setReason] = useState("");

  const onReject = () => {
    reviewCourse.mutate(
      { courseId: course.id, decision: "rejected", rejection_reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("تم رفض الكورس");
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر رفض الكورس")),
      },
    );
  };

  return (
    <TableRow>
      <TableCell colSpan={5}>
        <div className="flex w-full flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-end">
          <Textarea placeholder="سبب الرفض (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="flex-1" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDone}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={reviewCourse.isPending} onClick={onReject}>
              تأكيد الرفض
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PendingLessonRow({ lesson, onRejecting }: { lesson: PendingLesson; onRejecting: (id: string | null) => void }) {
  const reviewLesson = useReviewLesson();
  const { moduleTitle, courseTitle, courseId } = getPendingLessonContext(lesson);

  const onApprove = () => {
    reviewLesson.mutate(
      { lessonId: lesson.id, decision: "published" },
      {
        onSuccess: () => toast.success("تم نشر الدرس"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر نشر الدرس")),
      },
    );
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{lesson.title}</TableCell>
      <TableCell className="text-muted-foreground">
        {courseId ? (
          <Link href={`/admin/courses`} className="underline">
            {courseTitle} / {moduleTitle}
          </Link>
        ) : (
          `${courseTitle} / ${moduleTitle}`
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{new Date(lesson.submitted_at).toLocaleDateString("ar-EG")}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={reviewLesson.isPending} onClick={onApprove}>
            موافقة
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onRejecting(lesson.id)}>
            رفض
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RejectLessonRow({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const reviewLesson = useReviewLesson();
  const [reason, setReason] = useState("");

  const onReject = () => {
    reviewLesson.mutate(
      { lessonId, decision: "rejected", rejection_reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("تم رفض الدرس");
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر رفض الدرس")),
      },
    );
  };

  return (
    <TableRow>
      <TableCell colSpan={4}>
        <div className="flex w-full flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-end">
          <Textarea placeholder="سبب الرفض (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="flex-1" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDone}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={reviewLesson.isPending} onClick={onReject}>
              تأكيد الرفض
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AdminCoursesPage() {
  const { data: courses, isLoading } = useAllCourses();
  const { data: pendingLessons, isLoading: lessonsLoading } = usePendingLessons();
  const { data: enrollmentCounts } = useCourseEnrollmentCounts();
  const reviewCourse = useReviewCourse();
  const [rejectingCourseId, setRejectingCourseId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [rejectingLessonId, setRejectingLessonId] = useState<string | null>(null);

  const onApprove = (courseId: string) => {
    reviewCourse.mutate(
      { courseId, decision: "published" },
      {
        onSuccess: () => toast.success("تم نشر الكورس"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر نشر الكورس")),
      },
    );
  };

  const awaitingCount = courses?.filter((c) => !!c.submitted_at)?.length ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">الكورسات والموافقات</h1>
        {awaitingCount > 0 && <p className="text-small text-muted-foreground">{awaitingCount} كورس في انتظار المراجعة والتعديلات</p>}
      </div>

      {!lessonsLoading && !!pendingLessons?.length && (
        <div className="flex w-full flex-col gap-3">
          <h2 className="text-h3 text-secondary dark:text-white">دروس في انتظار المراجعة</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدرس</TableHead>
                <TableHead>الكورس / الوحدة</TableHead>
                <TableHead>تاريخ الإرسال</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingLessons.map((lesson) =>
                rejectingLessonId === lesson.id ? (
                  <RejectLessonRow key={lesson.id} lessonId={lesson.id} onDone={() => setRejectingLessonId(null)} />
                ) : (
                  <PendingLessonRow key={lesson.id} lesson={lesson} onRejecting={setRejectingLessonId} />
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="text-h3 text-secondary dark:text-white">الكورسات</h2>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !courses?.length && <p className="py-8 text-center text-small text-muted-foreground">مفيش كورسات.</p>}

      {!isLoading && !!courses?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>عدد المشتركين</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => {
              if (rejectingCourseId === course.id) {
                return <RejectCourseRow key={course.id} course={course} onDone={() => setRejectingCourseId(null)} />;
              }
              if (deletingCourseId === course.id) {
                return <DeleteCourseRow key={course.id} course={course} onDone={() => setDeletingCourseId(null)} />;
              }
              return (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    <Link href={`/teacher/courses/${course.id}`} className="hover:underline text-primary">
                      {course.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ContentStatusBadge status={course.status} submittedAt={course.submitted_at} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{enrollmentCounts?.[course.id] ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(course.created_at).toLocaleDateString("ar-EG")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {course.submitted_at && (
                        <>
                          <Button size="sm" disabled={reviewCourse.isPending} onClick={() => onApprove(course.id)}>
                            موافقة
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectingCourseId(course.id)}>
                            رفض
                          </Button>
                        </>
                      )}
                      <Link href={`/teacher/courses/${course.id}`}>
                        <Button size="sm" variant="outline" type="button">
                          تعديل
                        </Button>
                      </Link>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingCourseId(course.id)}>
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
