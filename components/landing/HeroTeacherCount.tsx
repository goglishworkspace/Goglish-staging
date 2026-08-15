"use client";

import { useTeachers } from "@/lib/api/queries/teachers";
import { royalSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/** Real count, not a marketing-copy guess - reuses the same query
 * TeachersSection already makes further down the page (React Query dedupes
 * it), so this never shows a number the teacher strip itself disagrees with. */
export function HeroTeacherCount() {
  const { data: teachers } = useTeachers();
  if (!teachers?.length) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={cn(royalSerif.className, "text-2xl font-bold text-primary")}>
        {teachers.length.toLocaleString("ar-EG")}
      </span>
      <span className="text-small">مدرّس بيقدملك المنهج على Goglish</span>
    </div>
  );
}
