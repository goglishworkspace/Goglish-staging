import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Course } from "@/lib/api/queries/courses";

export function CourseCard({ course, showTeacher = true }: { course: Course; showTeacher?: boolean }) {
  const teacherNames = course.teachers
    .map((t) => t.display_name)
    .filter((name): name is string => !!name);

  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="w-full overflow-hidden transition-shadow hover:shadow-md">
        {course.cover_image_url ? (
          // Plain <img>, not next/image - the teacher pastes an arbitrary
          // external link here (Section 6, matches trailer_youtube_id's
          // paste-a-link pattern), and next/image's optimizer refuses to
          // fetch from any host that isn't allow-listed in next.config.ts
          // (which is deliberately locked to our own Supabase Storage hosts
          // for avatars/media - see the comment there).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="h-36 w-full object-cover"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-muted text-h3 text-muted-foreground">
            {course.title.charAt(0)}
          </div>
        )}
        <CardContent className="flex flex-col gap-1 p-4">
          <h3 className="line-clamp-1 font-semibold text-foreground">{course.title}</h3>
          {showTeacher && !!teacherNames.length && (
            <p className="line-clamp-1 text-caption text-muted-foreground">{teacherNames.join("، ")}</p>
          )}
          {course.description && (
            <p className="line-clamp-2 text-small text-muted-foreground">{course.description}</p>
          )}
          <p className="mt-1 text-small font-semibold text-secondary dark:text-white">
            {course.price_cents === 0
              ? "مجاني"
              : `${(course.price_cents / 100).toLocaleString("ar-EG")} ${course.currency}`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
