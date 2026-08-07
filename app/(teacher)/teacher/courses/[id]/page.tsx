"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { useCourse } from "@/lib/api/queries/courses";
import {
  useCourseModules,
  useModuleLessons,
  useCreateModule,
  useUpdateModule,
  useCreateLesson,
  useUpdateLesson,
  useSubmitLessonForReview,
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
  type Quiz,
} from "@/lib/api/queries/quizzes";
import {
  useCourseExams,
  useCreateExam,
  useUpdateExam,
  usePublishExam,
  useExamQuestions,
  useCreateExamQuestion,
  type Exam,
} from "@/lib/api/queries/exams";
import type { QuestionInput } from "@/lib/api/queries/question-types";
import { extractYouTubeId } from "@/lib/utils";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
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
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(quiz.title);

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
          </div>
        </div>

        {isLoading && <Skeleton className="h-8 w-full" />}
        {!isLoading && !!questions?.length && (
          <ul className="flex flex-col gap-1">
            {questions.map((q) => (
              <li key={q.id} className="text-small text-muted-foreground">
                {q.order_index + 1}. {q.prompt} ({q.type === "mcq" ? "اختيار من متعدد" : "صح/غلط"})
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
  const [editOpen, setEditOpen] = useState(false);
  const [showQuizzes, setShowQuizzes] = useState(false);
  const canEdit = lesson.status === "draft" || lesson.status === "rejected";

  const onSubmitLesson = () => {
    submitLesson.mutate(lesson.id, {
      onSuccess: () => toast.success("تم إرسال الدرس للمراجعة"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال الدرس للمراجعة")),
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
            <h3 className="font-semibold text-foreground">{mod.title}</h3>
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
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(exam.title);

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
          </div>
        </div>

        {isLoading && <Skeleton className="h-8 w-full" />}
        {!isLoading && !!questions?.length && (
          <ul className="flex flex-col gap-1">
            {questions.map((q) => (
              <li key={q.id} className="text-small text-muted-foreground">
                {q.order_index + 1}. {q.prompt} ({q.type === "mcq" ? "اختيار من متعدد" : "صح/غلط"})
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createExam.mutate(
      { title: title.trim() },
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

export default function TeacherCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: course, isLoading: courseLoading } = useCourse(id);
  const { data: modules, isLoading: modulesLoading } = useCourseModules(id);
  const [addingModule, setAddingModule] = useState(false);

  return (
    <div className="flex w-full flex-col gap-6">
      {courseLoading ? (
        <Skeleton className="h-9 w-64" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h2 text-secondary dark:text-white">{course?.title}</h1>
          {course && <ContentStatusBadge status={course.status} submittedAt={course.submitted_at} />}
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
