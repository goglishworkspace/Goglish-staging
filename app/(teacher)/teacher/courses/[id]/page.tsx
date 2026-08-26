"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Send, DollarSign, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContentStatusBadge } from "@/components/shared/ContentStatusBadge";
import { QuestionForm } from "@/components/teacher/QuestionForm";
import { useCourse, useUpdateCourse, useSubmitCourseForReview, type Course } from "@/lib/api/queries/courses";
import {
  useCourseModules,
  useModuleLessons,
  useCreateModule,
  useUpdateModule,
  useCreateLesson,
  useUpdateLesson,
  useSubmitLessonForReview,
  useRequestModuleDeletion,
  useRequestLessonDeletion,
  type CourseModule,
  type Lesson,
} from "@/lib/api/queries/modules";
import {
  useLessonQuizzes,
  useCreateQuiz,
  useUpdateQuiz,
  usePublishQuiz,
  useQuizQuestions,
  useCreateQuizQuestion,
  useRequestQuizDeletion,
  useRequestQuizQuestionDeletion,
  type Quiz,
} from "@/lib/api/queries/quizzes";
import {
  useCourseExams,
  useCreateExam,
  useUpdateExam,
  usePublishExam,
  useExamQuestions,
  useCreateExamQuestion,
  useRequestExamDeletion,
  useRequestExamQuestionDeletion,
  type Exam,
} from "@/lib/api/queries/exams";
import type { QuestionInput } from "@/lib/api/queries/question-types";
import { extractYouTubeId } from "@/lib/utils";
import { useLessonResources, useUploadLessonResource, useRequestResourceDeletion } from "@/lib/api/queries/lesson-resources";
import { FileText } from "lucide-react";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

function LessonResourcesSection({ lessonId }: { lessonId: string }) {
  const { data: resources, isLoading } = useLessonResources(lessonId);
  const uploadResource = useUploadLessonResource(lessonId);
  const requestDeletion = useRequestResourceDeletion(lessonId);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);

  const onUpload = () => {
    if (!resourceFile || !resourceTitle.trim()) {
      toast.error("لازم تختار ملف وتكتب عنوان له");
      return;
    }
    uploadResource.mutate(
      { file: resourceFile, title: resourceTitle.trim() },
      {
        onSuccess: () => {
          toast.success("تم رفع الملف");
          setResourceTitle("");
          setResourceFile(null);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر رفع الملف")),
      },
    );
  };

  const onRequestDeletion = (resourceId: string) => {
    requestDeletion.mutate(resourceId, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>ملفات الدرس (PDF)</Label>
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : resources && resources.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-caption text-muted-foreground">
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate">{r.title}</span>
              <span className="shrink-0">({formatFileSize(r.file_size_bytes)})</span>
              {r.deletion_requested_at ? (
                <span className="shrink-0 text-primary">قيد المراجعة للحذف</span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="طلب حذف الملف"
                  disabled={requestDeletion.isPending}
                  onClick={() => onRequestDeletion(r.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-muted-foreground">مفيش ملفات مرفوعة على الدرس ده لسه</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="عنوان الملف"
            value={resourceTitle}
            onChange={(e) => setResourceTitle(e.target.value)}
          />
        </div>
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => setResourceFile(e.target.files?.[0] ?? null)}
          className="sm:w-56"
        />
        <Button type="button" size="sm" disabled={uploadResource.isPending} onClick={onUpload}>
          رفع
        </Button>
      </div>
    </div>
  );
}

function EditLessonDialog({
  lesson,
  open,
  onOpenChange,
  moduleId,
}: {
  lesson: Lesson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
}) {
  const updateLesson = useUpdateLesson(moduleId);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [videoUrl, setVideoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("عنوان الدرس مطلوب");
      return;
    }
    const input: {
      title: string;
      description?: string;
      is_preview?: boolean;
      youtube_preview_video_id?: string;
      youtube_video_id?: string;
    } = {
      title: title.trim(),
      description: description.trim() || undefined,
    };
    if (videoUrl.trim()) {
      const videoId = extractYouTubeId(videoUrl);
      if (!videoId) {
        toast.error("رابط فيديو الدرس مش رابط يوتيوب صالح");
        return;
      }
      input.youtube_video_id = videoId;
    }
    if (previewUrl.trim()) {
      const videoId = extractYouTubeId(previewUrl);
      if (!videoId) {
        toast.error("رابط المعاينة مش رابط يوتيوب صالح");
        return;
      }
      input.is_preview = true;
      input.youtube_preview_video_id = videoId;
    }
    updateLesson.mutate(
      { lessonId: lesson.id, input },
      {
        onSuccess: () => {
          toast.success("تم تحديث الدرس");
          onOpenChange(false);
          setVideoUrl("");
          setPreviewUrl("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الدرس")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الدرس</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-title">عنوان الدرس</Label>
            <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-description">وصف الدرس</Label>
            <Textarea
              id="lesson-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-video-url">رابط فيديو الدرس (محمي)</Label>
            <Input
              id="lesson-video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-caption text-muted-foreground">
              ارفع الفيديو على يوتيوب كـ Unlisted (غير مُدرج) وحط اللينك هنا. الفيديو ده مش هيتشاهد غير للطلاب اللي
              اشتروا الكورس. سيبه فاضي لو مش عايز تغيّره.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-preview-url">رابط فيديو معاينة مجاني (اختياري) {lesson.is_preview && "(محدّث حاليًا)"}</Label>
            <Input
              id="lesson-preview-url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-caption text-muted-foreground">
              فيديو تشويقي قصير يقدر أي حد يشوفه من غير ما يشترك. سيبه فاضي لو مش عايز تضيف/تغيّر معاينة.
            </p>
          </div>
          <LessonResourcesSection lessonId={lesson.id} />
          <DialogFooter>
            <Button type="submit" disabled={updateLesson.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuizCard({ quiz, lessonId }: { quiz: Quiz; lessonId: string }) {
  const { data: questions, isLoading } = useQuizQuestions(quiz.id);
  const createQuestion = useCreateQuizQuestion(quiz.id);
  const updateQuiz = useUpdateQuiz(lessonId);
  const publishQuiz = usePublishQuiz(lessonId);
  const requestQuizDeletion = useRequestQuizDeletion(lessonId);
  const requestQuestionDeletion = useRequestQuizQuestionDeletion(quiz.id);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(quiz.title);

  const onRequestQuizDeletion = () => {
    requestQuizDeletion.mutate(quiz.id, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  const onRequestQuestionDeletion = (questionId: string) => {
    requestQuestionDeletion.mutate(questionId, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  const onSaveTitle = () => {
    if (!titleDraft.trim()) return;
    updateQuiz.mutate(
      { quizId: quiz.id, title: titleDraft.trim() },
      {
        onSuccess: () => {
          toast.success("تم تحديث اسم التدريب");
          setEditingTitle(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث اسم التدريب")),
      },
    );
  };

  const onAddQuestion = (input: QuestionInput) => {
    createQuestion.mutate(input, {
      onSuccess: () => {
        toast.success("تم إضافة السؤال");
        setAddingQuestion(false);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إضافة السؤال")),
    });
  };

  const onPublish = () => {
    publishQuiz.mutate(quiz.id, {
      onSuccess: () => toast.success("تم نشر التدريب"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر نشر التدريب")),
    });
  };

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editingTitle ? (
            <div className="flex flex-1 items-center gap-2">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="max-w-64" />
              <Button size="sm" disabled={updateQuiz.isPending} onClick={onSaveTitle}>
                حفظ
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                إلغاء
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{quiz.title}</span>
              <Badge variant={quiz.status === "published" ? "default" : "outline"}>
                {quiz.status === "published" ? "منشور" : "مسودة"}
              </Badge>
              {quiz.deletion_requested_at && <Badge variant="outline">قيد المراجعة للحذف</Badge>}
            </div>
          )}
          <div className="flex items-center gap-2">
            {!editingTitle && (
              <Button size="sm" variant="outline" onClick={() => setEditingTitle(true)}>
                تعديل
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setAddingQuestion((v) => !v)}>
              <Plus />
              سؤال جديد
            </Button>
            {quiz.status === "draft" && (
              <Button size="sm" disabled={publishQuiz.isPending} onClick={onPublish}>
                نشر
              </Button>
            )}
            {!quiz.deletion_requested_at && (
              <Button
                size="sm"
                variant="destructive"
                disabled={requestQuizDeletion.isPending}
                onClick={onRequestQuizDeletion}
              >
                <Trash2 />
                طلب حذف
              </Button>
            )}
          </div>
        </div>

        {isLoading && <Skeleton className="h-8 w-full" />}
        {!isLoading && !!questions?.length && (
          <ul className="flex flex-col gap-1">
            {questions.map((q) => (
              <li key={q.id} className="flex items-center gap-2 text-small text-muted-foreground">
                <span className="min-w-0 flex-1">
                  {q.order_index + 1}. {q.prompt} ({q.type === "mcq" ? "اختيار من متعدد" : "صح/غلط"})
                </span>
                {q.deletion_requested_at ? (
                  <span className="shrink-0 text-caption text-primary">قيد المراجعة للحذف</span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="طلب حذف السؤال"
                    disabled={requestQuestionDeletion.isPending}
                    onClick={() => onRequestQuestionDeletion(q.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!isLoading && !questions?.length && (
          <p className="text-small text-muted-foreground">مفيش أسئلة لسه.</p>
        )}

        {addingQuestion && (
          <QuestionForm
            nextOrder={questions?.length ?? 0}
            onSubmit={onAddQuestion}
            isPending={createQuestion.isPending}
            onDone={() => setAddingQuestion(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AddQuizForm({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const createQuiz = useCreateQuiz(lessonId);
  const [title, setTitle] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createQuiz.mutate(
      { title: title.trim() },
      {
        onSuccess: () => {
          toast.success("تم إنشاء التدريب");
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء التدريب")),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input placeholder="عنوان التدريب" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" disabled={createQuiz.isPending}>
          إنشاء
        </Button>
      </div>
    </form>
  );
}

function LessonQuizzesPanel({ lessonId }: { lessonId: string }) {
  const { data: quizzes, isLoading } = useLessonQuizzes(lessonId);
  const [addingQuiz, setAddingQuiz] = useState(false);

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-small font-semibold text-foreground">التدريبات</h4>
        <Button size="sm" variant="outline" onClick={() => setAddingQuiz((v) => !v)}>
          <Plus />
          تدريب جديد
        </Button>
      </div>

      {addingQuiz && <AddQuizForm lessonId={lessonId} onDone={() => setAddingQuiz(false)} />}

      {isLoading && <Skeleton className="h-10 w-full" />}
      {!isLoading && !quizzes?.length && <p className="text-small text-muted-foreground">مفيش تدريبات لسه.</p>}
      {!isLoading && quizzes?.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} lessonId={lessonId} />)}
    </div>
  );
}

function AddLessonForm({ moduleId, nextOrder, onDone }: { moduleId: string; nextOrder: number; onDone: () => void }) {
  const createLesson = useCreateLesson(moduleId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createLesson.mutate(
      { title: title.trim(), description: description.trim() || undefined, order_index: nextOrder },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الدرس كمسودة");
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الدرس")),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 rounded-lg border border-border p-3">
      <Input placeholder="عنوان الدرس" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="وصف الدرس (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" disabled={createLesson.isPending}>
          إضافة الدرس
        </Button>
      </div>
    </form>
  );
}

function LessonRow({ lesson, moduleId }: { lesson: Lesson; moduleId: string }) {
  const submitLesson = useSubmitLessonForReview(moduleId);
  const requestLessonDeletion = useRequestLessonDeletion(moduleId);
  const [editOpen, setEditOpen] = useState(false);
  const [showQuizzes, setShowQuizzes] = useState(false);
  const canEdit = lesson.status === "draft" || lesson.status === "rejected";

  const onSubmitLesson = () => {
    submitLesson.mutate(lesson.id, {
      onSuccess: () => toast.success("تم إرسال الدرس للمراجعة"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال الدرس للمراجعة")),
    });
  };

  const onRequestDeletion = () => {
    requestLessonDeletion.mutate(lesson.id, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{lesson.title}</p>
          {lesson.rejection_reason && <p className="text-caption text-destructive">السبب: {lesson.rejection_reason}</p>}
          {lesson.is_preview && <p className="text-caption text-primary">فيه فيديو معاينة مربوط</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              تعديل
            </Button>
          ) : (
            <span className="text-caption text-muted-foreground" title="الدرس منشور أو قيد المراجعة، مينفعش تتعدل بياناته الأساسية">
              مقفول للتعديل
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowQuizzes((v) => !v)}>
            التدريبات
          </Button>
          <ContentStatusBadge status={lesson.status} submittedAt={lesson.submitted_at} />
          {(lesson.status === "draft" || lesson.status === "rejected") && !lesson.submitted_at && (
            <Button size="sm" disabled={submitLesson.isPending} onClick={onSubmitLesson}>
              إرسال للمراجعة
            </Button>
          )}
          {lesson.deletion_requested_at ? (
            <span className="text-caption text-primary">قيد المراجعة للحذف</span>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              disabled={requestLessonDeletion.isPending}
              onClick={onRequestDeletion}
            >
              <Trash2 />
              طلب حذف
            </Button>
          )}
        </div>
      </div>

      {showQuizzes && <LessonQuizzesPanel lessonId={lesson.id} />}

      {canEdit && (
        <EditLessonDialog lesson={lesson} open={editOpen} onOpenChange={setEditOpen} moduleId={moduleId} />
      )}
    </li>
  );
}

function ModuleSection({ module: mod }: { module: CourseModule }) {
  const { data: lessons, isLoading } = useModuleLessons(mod.id);
  const updateModule = useUpdateModule(mod.course_id);
  const requestModuleDeletion = useRequestModuleDeletion(mod.course_id);
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(mod.title);

  const onSaveTitle = () => {
    if (!titleDraft.trim()) return;
    updateModule.mutate(
      { moduleId: mod.id, title: titleDraft.trim() },
      {
        onSuccess: () => {
          toast.success("تم تحديث عنوان الوحدة");
          setEditingTitle(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث عنوان الوحدة")),
      },
    );
  };

  const onRequestDeletion = () => {
    requestModuleDeletion.mutate(mod.id, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          {editingTitle ? (
            <div className="flex flex-1 items-center gap-2">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="max-w-64" />
              <Button size="sm" disabled={updateModule.isPending} onClick={onSaveTitle}>
                حفظ
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                إلغاء
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{mod.title}</h3>
              {mod.deletion_requested_at && <Badge variant="outline">قيد المراجعة للحذف</Badge>}
            </div>
          )}
          <div className="flex items-center gap-2">
            {!editingTitle && (
              <Button size="sm" variant="outline" onClick={() => setEditingTitle(true)}>
                تعديل
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setAddingLesson((v) => !v)}>
              <Plus />
              درس جديد
            </Button>
            {!mod.deletion_requested_at && (
              <Button
                size="sm"
                variant="destructive"
                disabled={requestModuleDeletion.isPending}
                onClick={onRequestDeletion}
              >
                <Trash2 />
                طلب حذف
              </Button>
            )}
          </div>
        </div>

        {addingLesson && (
          <AddLessonForm moduleId={mod.id} nextOrder={lessons?.length ?? 0} onDone={() => setAddingLesson(false)} />
        )}

        {isLoading && <Skeleton className="h-10 w-full" />}

        {!isLoading && !lessons?.length && (
          <p className="text-small text-muted-foreground">لا يوجد دروس في هذه الوحدة لسه.</p>
        )}

        {!isLoading && !!lessons?.length && (
          <ul className="flex w-full flex-col gap-2">
            {lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} moduleId={mod.id} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AddModuleForm({ courseId, nextOrder, onDone }: { courseId: string; nextOrder: number; onDone: () => void }) {
  const createModule = useCreateModule(courseId);
  const [title, setTitle] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createModule.mutate(
      { title: title.trim(), order_index: nextOrder },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الوحدة");
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الوحدة")),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input placeholder="عنوان الوحدة" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" disabled={createModule.isPending}>
          إضافة
        </Button>
      </div>
    </form>
  );
}

function ExamCard({ exam, courseId }: { exam: Exam; courseId: string }) {
  const { data: questions, isLoading } = useExamQuestions(exam.id);
  const createQuestion = useCreateExamQuestion(exam.id);
  const updateExam = useUpdateExam(courseId);
  const publishExam = usePublishExam(courseId);
  const requestExamDeletion = useRequestExamDeletion(courseId);
  const requestQuestionDeletion = useRequestExamQuestionDeletion(exam.id);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(exam.title);

  const onRequestExamDeletion = () => {
    requestExamDeletion.mutate(exam.id, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  const onRequestQuestionDeletion = (questionId: string) => {
    requestQuestionDeletion.mutate(questionId, {
      onSuccess: () => toast.success("تم إرسال طلب الحذف، هيتراجع من الأدمن"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال طلب الحذف")),
    });
  };

  const onSaveTitle = () => {
    if (!titleDraft.trim()) return;
    updateExam.mutate(
      { examId: exam.id, title: titleDraft.trim() },
      {
        onSuccess: () => {
          toast.success("تم تحديث اسم الامتحان");
          setEditingTitle(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث اسم الامتحان")),
      },
    );
  };

  const onAddQuestion = (input: QuestionInput) => {
    createQuestion.mutate(input, {
      onSuccess: () => {
        toast.success("تم إضافة السؤال");
        setAddingQuestion(false);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إضافة السؤال")),
    });
  };

  const onPublish = () => {
    publishExam.mutate(exam.id, {
      onSuccess: () => toast.success("تم نشر الامتحان"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر نشر الامتحان")),
    });
  };

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editingTitle ? (
            <div className="flex flex-1 items-center gap-2">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="max-w-64" />
              <Button size="sm" disabled={updateExam.isPending} onClick={onSaveTitle}>
                حفظ
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                إلغاء
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{exam.title}</span>
              <Badge variant={exam.status === "published" ? "default" : "outline"}>
                {exam.status === "published" ? "منشور" : "مسودة"}
              </Badge>
              {exam.deletion_requested_at && <Badge variant="outline">قيد المراجعة للحذف</Badge>}
            </div>
          )}
          <div className="flex items-center gap-2">
            {!editingTitle && (
              <Button size="sm" variant="outline" onClick={() => setEditingTitle(true)}>
                تعديل
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setAddingQuestion((v) => !v)}>
              <Plus />
              سؤال جديد
            </Button>
            {exam.status === "draft" && (
              <Button size="sm" disabled={publishExam.isPending} onClick={onPublish}>
                نشر
              </Button>
            )}
            {!exam.deletion_requested_at && (
              <Button
                size="sm"
                variant="destructive"
                disabled={requestExamDeletion.isPending}
                onClick={onRequestExamDeletion}
              >
                <Trash2 />
                طلب حذف
              </Button>
            )}
          </div>
        </div>

        {isLoading && <Skeleton className="h-8 w-full" />}
        {!isLoading && !!questions?.length && (
          <ul className="flex flex-col gap-1">
            {questions.map((q) => (
              <li key={q.id} className="flex items-center gap-2 text-small text-muted-foreground">
                <span className="min-w-0 flex-1">
                  {q.order_index + 1}. {q.prompt} ({q.type === "mcq" ? "اختيار من متعدد" : "صح/غلط"})
                </span>
                {q.deletion_requested_at ? (
                  <span className="shrink-0 text-caption text-primary">قيد المراجعة للحذف</span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="طلب حذف السؤال"
                    disabled={requestQuestionDeletion.isPending}
                    onClick={() => onRequestQuestionDeletion(q.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!isLoading && !questions?.length && <p className="text-small text-muted-foreground">مفيش أسئلة لسه.</p>}

        {addingQuestion && (
          <QuestionForm
            nextOrder={questions?.length ?? 0}
            onSubmit={onAddQuestion}
            isPending={createQuestion.isPending}
            onDone={() => setAddingQuestion(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AddExamForm({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const createExam = useCreateExam(courseId);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedMinutes = Number(minutes);
    createExam.mutate(
      {
        title: title.trim(),
        ...(minutes.trim() && parsedMinutes > 0 ? { time_limit_seconds: Math.round(parsedMinutes * 60) } : {}),
      },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الامتحان");
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الامتحان")),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input placeholder="عنوان الامتحان" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="w-full sm:w-32">
        <Input
          type="number"
          min={1}
          placeholder="المدة (دقيقة)"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" disabled={createExam.isPending}>
          إنشاء
        </Button>
      </div>
    </form>
  );
}

function CourseExamsSection({ courseId }: { courseId: string }) {
  const { data: exams, isLoading } = useCourseExams(courseId);
  const [addingExam, setAddingExam] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-secondary dark:text-white">الامتحانات</h2>
        <Button variant="outline" onClick={() => setAddingExam((v) => !v)}>
          <Plus />
          امتحان جديد
        </Button>
      </div>

      {addingExam && <AddExamForm courseId={courseId} onDone={() => setAddingExam(false)} />}

      {isLoading && <Skeleton className="h-24 w-full rounded-xl" />}
      {!isLoading && !exams?.length && <p className="py-4 text-center text-small text-muted-foreground">لسه معملتش امتحانات للكورس ده.</p>}
      {!isLoading && !!exams?.length && (
        <div className="flex w-full flex-col gap-3">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} courseId={courseId} />
          ))}
        </div>
      )}
    </div>
  );
}

function EditCourseDialog({
  course,
  open,
  onOpenChange,
}: {
  course: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateCourse = useUpdateCourse();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(course.cover_image_url ?? "");
  const [trailerUrl, setTrailerUrl] = useState(
    course.trailer_youtube_id ? `https://www.youtube.com/watch?v=${course.trailer_youtube_id}` : ""
  );
  const [priceEgp, setPriceEgp] = useState((course.price_cents / 100).toString());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("عنوان الكورس مطلوب");
      return;
    }

    let trailerId: string | undefined = undefined;
    if (trailerUrl.trim()) {
      const extracted = extractYouTubeId(trailerUrl);
      if (!extracted) {
        toast.error("رابط فيديو البرومو غير صالح");
        return;
      }
      trailerId = extracted;
    }

    const priceCents = priceEgp.trim() ? Math.round(Number(priceEgp) * 100) : 0;

    updateCourse.mutate(
      {
        courseId: course.id,
        input: {
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: coverImageUrl.trim() || undefined,
          trailer_youtube_id: trailerId,
          price_cents: priceCents >= 0 ? priceCents : 0,
        },
      },
      {
        onSuccess: () => {
          toast.success("تم حفظ التعديلات بنجاح وإرسالها للمراجعة");
          onOpenChange(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الكورس")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الكورس</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-title">اسم / عنوان الكورس</Label>
            <Input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-desc">وصف الكورس</Label>
            <Textarea
              id="course-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="اكتب وصفاً مفصلاً ومميزات الكورس..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-cover">رابط صورة الغلاف (Cover Image URL)</Label>
            <Input
              id="course-cover"
              dir="ltr"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-trailer">فيديو البرومو (يوتيوب)</Label>
              <Input
                id="course-trailer"
                dir="ltr"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-price">السعر (جنيه مصري)</Label>
              <Input
                id="course-price"
                type="number"
                min="0"
                step="5"
                value={priceEgp}
                onChange={(e) => setPriceEgp(e.target.value)}
                placeholder="مثلاً: 250"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={updateCourse.isPending}>
              {updateCourse.isPending ? "جاري الحفظ..." : "حفظ التعديلات وإرسالها 📤"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: course, isLoading: courseLoading } = useCourse(id);
  const { data: modules, isLoading: modulesLoading } = useCourseModules(id);
  const submitCourse = useSubmitCourseForReview();
  const [addingModule, setAddingModule] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);

  const onSubmitForReview = () => {
    submitCourse.mutate(id, {
      onSuccess: () => toast.success("تم إرسال الكورس للمراجعة من قبل الإدارة"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال الكورس للمراجعة")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {courseLoading ? (
        <Skeleton className="h-9 w-64" />
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-h2 text-secondary dark:text-white">{course?.title}</h1>
              {course && <ContentStatusBadge status={course.status} submittedAt={course.submitted_at} />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {course && (
                <Button variant="outline" onClick={() => setEditingCourse(true)}>
                  <Edit3 className="size-4" />
                  تعديل بيانات الكورس
                </Button>
              )}
              {course && course.status !== "published" && (
                <Button disabled={submitCourse.isPending} onClick={onSubmitForReview}>
                  <Send className="size-4" />
                  إرسال للمراجعة
                </Button>
              )}
            </div>
          </div>

          {course?.description && (
            <p className="text-small text-muted-foreground">{course.description}</p>
          )}

          {course && (
            <div className="flex flex-wrap gap-4 text-caption text-muted-foreground border-t border-border pt-3">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="size-4 text-primary" />
                السعر: {course.price_cents > 0 ? `${course.price_cents / 100} ج.م` : "مجاني"}
              </span>
              {course.trailer_youtube_id && (
                <span className="flex items-center gap-1 text-primary">
                  <Film className="size-4" />
                  فيديو البرومو مضاف
                </span>
              )}
            </div>
          )}

          {course && (
            <EditCourseDialog
              course={course}
              open={editingCourse}
              onOpenChange={setEditingCourse}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-secondary dark:text-white">الوحدات والدروس</h2>
        <Button variant="outline" onClick={() => setAddingModule((v) => !v)}>
          <Plus />
          وحدة جديدة
        </Button>
      </div>

      {addingModule && (
        <AddModuleForm courseId={id} nextOrder={modules?.length ?? 0} onDone={() => setAddingModule(false)} />
      )}

      {modulesLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!modulesLoading && !modules?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">لسه معملتش وحدات في الكورس ده.</p>
      )}

      {!modulesLoading && !!modules?.length && (
        <div className="flex w-full flex-col gap-4">
          {modules.map((mod) => (
            <ModuleSection key={mod.id} module={mod} />
          ))}
        </div>
      )}

      <CourseExamsSection courseId={id} />
    </div>
  );
}
