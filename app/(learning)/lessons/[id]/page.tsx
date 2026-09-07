import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, GraduationCap, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLessonPlayback } from "@/lib/services/lesson-playback.service";
import { hasCourseAccess } from "@/lib/services/entitlement.service";
import { LessonPlayer } from "./_components/LessonPlayer";
import { ProgressTracker } from "./_components/ProgressTracker";
import { CourseNavSidebar } from "./_components/CourseNavSidebar";
import { VideoTimeProvider } from "./_components/VideoTimeContext";
import { LessonTabs } from "./_components/LessonTabs";
import { Badge } from "@/components/ui/badge";

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
    .select("id, title, description, module_id, modules(id, title, course_id, courses(id, title))")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!lesson) notFound();

  const moduleData = lesson.modules as unknown as {
    id: string;
    title: string;
    course_id: string;
    courses: { id: string; title: string } | null;
  } | null;

  const courseId = moduleData?.course_id ?? null;
  const courseTitle = moduleData?.courses?.title ?? "الكورس";
  const moduleTitle = moduleData?.title ?? null;

  const playback = await getLessonPlayback(supabase, id, user?.id ?? null);
  const hasAccess = user && courseId ? await hasCourseAccess(supabase, user.id, courseId) : false;
  const isVideoPlayback = playback.kind === "youtube_protected" || playback.kind === "youtube";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumbs & Context Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/student/my-courses"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <GraduationCap className="size-3.5" />
            <span>كورساتي</span>
          </Link>
          <ChevronLeft className="size-3.5 text-muted-foreground/60" />

          {courseId && (
            <>
              <Link
                href={`/courses/${courseId}`}
                className="hover:text-primary transition-colors font-medium truncate max-w-[200px]"
              >
                {courseTitle}
              </Link>
              <ChevronLeft className="size-3.5 text-muted-foreground/60" />
            </>
          )}

          {moduleTitle && (
            <>
              <span className="text-muted-foreground/80 truncate max-w-[180px]">
                {moduleTitle}
              </span>
              <ChevronLeft className="size-3.5 text-muted-foreground/60" />
            </>
          )}

          <span className="font-bold text-foreground truncate max-w-[250px]">
            {lesson.title}
          </span>
        </div>

        {/* Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge className="border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5">
                <Video className="size-3 me-1" />
                درس تفاعلي
              </Badge>
              {hasAccess && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-[10px] font-semibold">
                  مشترك في الكورس
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              {lesson.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Layout: Video + Tabs on right/center, Sidebar on left */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Main Learning Stream */}
        <main className="min-w-0 flex-1 flex flex-col gap-6">
          <VideoTimeProvider>
            {/* Video Player Card */}
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-black shadow-2xl">
              <LessonPlayer playback={playback} />
            </div>

            {/* Lesson Completion Status Bar */}
            {user && isVideoPlayback && (
              <ProgressTracker lessonId={id} />
            )}

            {/* Royal Structured Learning Tabs (Notes, Q&A, Resources, Quiz, Overview) */}
            <LessonTabs
              lessonId={id}
              hasAccess={hasAccess}
              isLoggedIn={!!user}
              description={lesson.description}
              focusCommentId={focusCommentId}
            />
          </VideoTimeProvider>
        </main>

        {/* Sticky Curriculum Navigation Sidebar */}
        {courseId && (
          <aside className="w-full shrink-0 lg:w-80 lg:sticky lg:top-24">
            <CourseNavSidebar
              moduleId={lesson.module_id}
              courseId={courseId}
              currentLessonId={id}
              hasAccess={hasAccess}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
