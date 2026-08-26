"use client";

import { useTeachers } from "@/lib/api/queries/teachers";

/** Real count, not a marketing-copy guess - reuses the same query
 * TeachersSection already makes further down the page (React Query dedupes
 * it), so this never shows a number the teacher strip itself disagrees with.
 * Plain Cairo, not the honor board's reserved serif - that font is declared
 * per-file on purpose (see HonorBoardPodium.tsx's comment), so it stays a
 * one-place signature instead of a second next/font instance to manage. */
export function HeroTeacherCount() {
  const { data: teachers } = useTeachers();
  if (!teachers?.length) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-2xl font-black text-primary">{teachers.length.toLocaleString("ar-EG")}</span>
      <span className="text-small">مدرّس بيقدملك المنهج على Goglish</span>
    </div>
  );
}
