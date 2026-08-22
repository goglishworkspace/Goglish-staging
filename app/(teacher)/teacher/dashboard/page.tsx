"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContentStatusBadge } from "@/components/shared/ContentStatusBadge";
import { useMyTeacher } from "@/lib/api/queries/teacher";
import { useSubjects } from "@/lib/api/queries/subjects";
import {
  useCoursesByTeacher,
  useCreateCourse,
  useSubmitCourseForReview,
  useUpdateCourse,
  type Course,
} from "@/lib/api/queries/courses";
import { slugify, extractYouTubeId } from "@/lib/utils";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function CreateCourseDialog({ teacherId }: { teacherId: string }) {
  const { data: subjects } = useSubjects();
  const createCourse = useCreateCourse();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [priceEgp, setPriceEgp] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) {
      toast.error("العنوان والمادة مطلوبين");
      return;
    }
    const price = priceEgp.trim() ? Number(priceEgp) : 0;
    if (Number.isNaN(price) || price < 0) {
      toast.error("السعر غير صالح");
      return;
    }
    let trailerYoutubeId: string | undefined;
    if (trailerUrl.trim()) {
      const videoId = extractYouTubeId(trailerUrl);
      if (!videoId) {
        toast.error("رابط يوتيوب غير صالح");
        return;
      }
      trailerYoutubeId = videoId;
    }
    createCourse.mutate(
      {
        title: title.trim(),
        subject_id: subjectId,
        slug: slugify(title),
        price_cents: Math.round(price * 100),
        ...(coverImageUrl.trim() ? { cover_image_url: coverImageUrl.trim() } : {}),
        ...(trailerYoutubeId ? { trailer_youtube_id: trailerYoutubeId } : {}),
      },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الكورس كمسودة");
          setOpen(false);
          setTitle("");
          setSubjectId("");
          setPriceEgp("");
          setCoverImageUrl("");
          setTrailerUrl("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الكورس")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        كورس جديد
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء كورس جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-title">عنوان الكورس</Label>
            <Input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-subject">المادة</Label>
            <Select
              value={subjectId}
              onValueChange={(value) => setSubjectId(value as string)}
              items={[{ label: "اختر مادة", value: "" }, ...(subjects ?? []).map((s) => ({ label: s.name, value: s.id }))]}
            >
              <SelectTrigger id="course-subject">
                <SelectValue placeholder="اختر مادة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">اختر مادة</SelectItem>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-price">السعر (ج.م)</Label>
            <Input
              id="course-price"
              type="number"
              min={0}
              step="0.01"
              value={priceEgp}
              onChange={(e) => setPriceEgp(e.target.value)}
              placeholder="سيبه فاضي لكورس مجاني"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-cover">رابط صورة الكورس (اختياري)</Label>
            <Input
              id="course-cover"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-caption text-muted-foreground">
              الصورة دي بتظهر في كارت الكورس في كل مكان في المنصة عشان تشد الطالب - حط رابط صورة من الإنترنت.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-trailer">رابط فيديو تشويقي (اختياري)</Label>
            <Input
              id="course-trailer"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-caption text-muted-foreground">
              الفيديو ده بيظهر لأي حد يزور صفحة الكورس حتى لو مش مشترك.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createCourse.isPending || !teacherId}>
              إنشاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCourseDialog({ course }: { course: Course }) {
  const canEditDetails = course.status === "draft" || course.status === "rejected";
  const updateCourse = useUpdateCourse();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(course.cover_image_url ?? "");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [priceEgp, setPriceEgp] = useState(String(course.price_cents / 100));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canEditDetails && !title.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }
    const input: {
      title?: string;
      description?: string;
      cover_image_url?: string;
      trailer_youtube_id?: string;
      price_cents?: number;
    } = canEditDetails
      ? {
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: coverImageUrl.trim() || undefined,
        }
      : {};
    if (trailerUrl.trim()) {
      const videoId = extractYouTubeId(trailerUrl);
      if (!videoId) {
        toast.error("رابط يوتيوب غير صالح");
        return;
      }
      input.trailer_youtube_id = videoId;
    }
    const price = Number(priceEgp);
    if (Number.isNaN(price) || price < 0) {
      toast.error("السعر غير صالح");
      return;
    }
    const priceCents = Math.round(price * 100);
    if (priceCents !== course.price_cents) {
      input.price_cents = priceCents;
    }
    if (Object.keys(input).length === 0) {
      toast.error("مفيش تغييرات لحفظها");
      return;
    }
    updateCourse.mutate(
      { courseId: course.id, input },
      {
        onSuccess: () => {
          toast.success("تم تحديث الكورس");
          setOpen(false);
          setTrailerUrl("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الكورس")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>تعديل</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الكورس</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {!canEditDetails && (
            <p className="text-caption text-muted-foreground">
              الكورس منشور بالفعل، فمينفعش تعدّل العنوان أو الوصف أو صورة الكورس - بس تقدر تغيّر السعر أو الفيديو التشويقي.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-course-title">عنوان الكورس</Label>
            <Input
              id="edit-course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEditDetails}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-course-description">الوصف</Label>
            <Textarea
              id="edit-course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={!canEditDetails}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-course-cover">رابط صورة الكورس</Label>
            <Input
              id="edit-course-cover"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              disabled={!canEditDetails}
            />
            <p className="text-caption text-muted-foreground">
              الصورة دي بتظهر في كارت الكورس في كل مكان في المنصة عشان تشد الطالب - حط رابط صورة من الإنترنت.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-course-price">السعر (ج.م)</Label>
            <Input
              id="edit-course-price"
              type="number"
              min={0}
              step="0.01"
              value={priceEgp}
              onChange={(e) => setPriceEgp(e.target.value)}
            />
            <p className="text-caption text-muted-foreground">حط 0 لو عايز الكورس يبقى مجاني. السعر بيتغير في أي وقت حتى لو الكورس منشور.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-course-trailer">رابط فيديو تشويقي {course.trailer_youtube_id && "(محدّث حاليًا)"}</Label>
            <Input
              id="edit-course-trailer"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-caption text-muted-foreground">
              سيبه فاضي لو مش عايز تغيّر الفيديو الحالي. الفيديو ده بيظهر لأي حد يزور صفحة الكورس حتى لو مش مشترك.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateCourse.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherContentOverviewPage() {
  const { data: teacher, isLoading: teacherLoading } = useMyTeacher();
  const { data: courses, isLoading: coursesLoading } = useCoursesByTeacher(teacher?.id ?? "");
  const submitCourse = useSubmitCourseForReview();

  const onSubmitCourse = (courseId: string) => {
    submitCourse.mutate(courseId, {
      onSuccess: () => toast.success("تم إرسال الكورس للمراجعة"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال الكورس للمراجعة")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">نظرة عامة على المحتوى</h1>
        {teacher && <CreateCourseDialog teacherId={teacher.id} />}
      </div>

      {(teacherLoading || coursesLoading) && <Skeleton className="h-64 w-full rounded-xl" />}

      {!teacherLoading && !coursesLoading && !courses?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">
          لسه معملتش أي كورس. ابدأ بإنشاء أول كورس ليك.
        </p>
      )}

      {!teacherLoading && !coursesLoading && !!courses?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <Link href={`/teacher/courses/${course.id}`} className="font-medium text-foreground underline">
                    {course.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <ContentStatusBadge status={course.status} submittedAt={course.submitted_at} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/teacher/courses/${course.id}`} />}>
                      إدارة المحتوى
                    </Button>
                    <EditCourseDialog course={course} />
                    {(course.status === "draft" || course.status === "rejected") && !course.submitted_at && (
                      <Button size="sm" disabled={submitCourse.isPending} onClick={() => onSubmitCourse(course.id)}>
                        إرسال للمراجعة
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
