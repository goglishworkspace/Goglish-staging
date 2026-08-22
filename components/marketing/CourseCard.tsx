import Link from "next/link";
import { PlayCircle, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { courseGradeName, type Course } from "@/lib/api/queries/courses";

export function CourseCard({ course, showTeacher = true }: { course: Course; showTeacher?: boolean }) {
  const teacherNames = course.teachers
    .map((t) => t.display_name)
    .filter((name): name is string => !!name);
  const gradeName = courseGradeName(course);

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
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-h3 text-muted-foreground">
            {course.title.charAt(0)}
          </div>
        )}
        <CardContent className="flex flex-col gap-1 p-4">
          <h3 className="line-clamp-1 font-semibold text-foreground">{course.title}</h3>
          {showTeacher && !!teacherNames.length && (
            <p className="line-clamp-1 text-caption text-muted-foreground">{teacherNames.join("، ")}</p>
          )}
          {gradeName && <p className="line-clamp-1 text-caption text-muted-foreground">{gradeName}</p>}
          {course.description && (
            <p className="line-clamp-2 text-small text-muted-foreground">{course.description}</p>
          )}
          <p className="mt-1 text-small font-semibold text-secondary dark:text-white">
            {course.price_cents === 0
              ? "مجاني"
              : `${(course.price_cents / 100).toLocaleString("ar-EG")} ${course.currency}`}
          </p>
          {/* A styled <span>, not a nested <Button> - the whole card is
              already one <Link>, and an interactive element can't nest
              inside another without breaking the DOM/a11y tree. */}
          <span className={cn(buttonVariants({ variant: course.has_access ? "default" : "outline" }), "mt-1 w-full justify-center")}>
            {course.has_access ? (
              <>
                <PlayCircle />
                إكمال التعلم
              </>
            ) : (
              <>
                <ShoppingCart />
                اشتراك
              </>
            )}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
