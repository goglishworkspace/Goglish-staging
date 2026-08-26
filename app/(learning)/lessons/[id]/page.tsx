import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLessonPlayback } from "@/lib/services/lesson-playback.service";
import { hasCourseAccess } from "@/lib/services/entitlement.service";
import { LessonPlayer } from "./_components/LessonPlayer";
import { ProgressTracker } from "./_components/ProgressTracker";
import { NotesPanel } from "./_components/NotesPanel";
import { CommentsSection } from "./_components/CommentsSection";
import { CourseNavSidebar } from "./_components/CourseNavSidebar";
import { QuizSection } from "./_components/QuizSection";
import { ResourcesPanel } from "./_components/ResourcesPanel";
import { VideoTimeProvider } from "./_components/VideoTimeContext";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { id } = await params;
  const { comment: focusCommentId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, description, module_id, modules(course_id)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!lesson) notFound();

  const courseId = (lesson.modules as unknown as { course_id: string } | null)?.course_id ?? null;
  const playback = await getLessonPlayback(supabase, id, user?.id ?? null);
  const hasAccess = user && courseId ? await hasCourseAccess(supabase, user.id, courseId) : false;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      <main className="min-w-0 flex-1">
        <h1 className="mb-4 text-h2 text-secondary dark:text-white">{lesson.title}</h1>
        <VideoTimeProvider>
        <LessonPlayer playback={playback} />

        {user && (playback.kind === "youtube_protected" || playback.kind === "youtube") && (
          <div className="mt-4">
            <ProgressTracker lessonId={id} />
          </div>
        )}

        {/* Outside view is titles only (Section 9) - the lesson description is
            real course content, so it only shows once the student can
            actually watch this lesson (bought the course, or it's a free
            preview lesson) - same condition as Notes below. */}
        {lesson.description && (playback.kind === "youtube_protected" || playback.kind === "youtube") && (
          <p className="mt-4 text-body text-muted-foreground">{lesson.description}</p>
        )}

        {hasAccess && (
          <div className="mt-6">
            <QuizSection lessonId={id} />
          </div>
        )}

        {hasAccess && (
          <section className="mt-8 w-full">
            <h2 className="text-h3 text-secondary dark:text-white">ملفات الدرس</h2>
            <div className="mt-4">
              <ResourcesPanel lessonId={id} />
            </div>
          </section>
        )}

        {user && (playback.kind === "youtube_protected" || playback.kind === "youtube") && (
          <section className="mt-8 w-full">
            <h2 className="text-h3 text-secondary dark:text-white">النوتات</h2>
            <div className="mt-4"><NotesPanel lessonId={id} /></div>
          </section>
        )}

        <section className="mt-8 w-full">
          <h2 className="text-h3 text-secondary dark:text-white">التعليقات</h2>
          <div className="mt-4">
            {user ? (
              <CommentsSection lessonId={id} focusCommentId={focusCommentId} />
            ) : (
              <p className="text-small text-muted-foreground">لازم تسجل دخول عشان تشوف وتكتب تعليقات.</p>
            )}
          </div>
        </section>
        </VideoTimeProvider>
      </main>

      {courseId && (
        <aside className="w-full shrink-0 lg:w-72">
          <CourseNavSidebar
            moduleId={lesson.module_id}
            courseId={courseId}
            currentLessonId={id}
            hasAccess={hasAccess}
          />
        </aside>
      )}
    </div>
  );
}
