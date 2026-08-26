"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTeachers } from "@/lib/api/queries/teachers";
import { TeacherCard } from "./TeacherCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { SectionEyebrow } from "./SectionEyebrow";

const VISIBLE_CARDS = 5;
const SCROLL_CARDS = 4;

export function TeachersSection() {
  const { data: teachers, isLoading, isError } = useTeachers();
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Measured from the actual rendered card (rather than hardcoded) so this
  // stays correct if TeacherCard's own width classes ever change.
  const [cardStep, setCardStep] = useState(0);
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const measure = () => {
      const scroller = scrollerRef.current;
      const firstCard = scroller?.firstElementChild as HTMLElement | null;
      if (!scroller || !firstCard) return;
      const gap = parseFloat(getComputedStyle(scroller).columnGap || "0");
      const step = firstCard.getBoundingClientRect().width + gap;
      setCardStep(step);
      setViewportWidth(step * VISIBLE_CARDS - gap);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [teachers]);

  const scrollByCards = (cards: number) => {
    scrollerRef.current?.scrollBy({ left: cardStep * cards, behavior: "smooth" });
  };

  return (
    <section id="teachers" className="w-full bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <SectionEyebrow>الفريق</SectionEyebrow>
            <h2 className="text-h2 text-secondary dark:text-white">مدرسونا</h2>
          </div>
          {!isLoading && !isError && !!teachers?.length && (
            <div className="flex items-center gap-3">
              <Link
                href="/teachers"
                className="flex items-center gap-1 text-small font-medium text-info hover:underline"
              >
                عرض الكل
                <ChevronLeft className="size-4" />
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-10 sm:size-7"
                  aria-label="اللي بعده"
                  onClick={() => scrollByCards(-SCROLL_CARDS)}
                >
                  <ChevronLeft className="size-5 sm:size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-10 sm:size-7"
                  aria-label="اللي قبله"
                  onClick={() => scrollByCards(SCROLL_CARDS)}
                >
                  <ChevronRight className="size-5 sm:size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          ref={scrollerRef}
          style={viewportWidth ? { maxWidth: viewportWidth } : undefined}
          className="mx-auto mt-8 flex gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {isLoading &&
            Array.from({ length: VISIBLE_CARDS }).map((_, i) => (
              <div key={i} className="flex w-24 shrink-0 flex-col items-center gap-2 sm:w-28">
                <Skeleton className="size-24 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}

          {!isLoading && isError && (
            <p className="w-full text-center text-small text-muted-foreground">
              تعذر تحميل بيانات المدرسين حالياً.
            </p>
          )}

          {!isLoading && !isError && teachers?.length === 0 && (
            <p className="w-full text-center text-small text-muted-foreground">
              لا يوجد مدرسون منشورون حالياً.
            </p>
          )}

          {!isLoading &&
            !isError &&
            teachers?.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
        </div>
      </Reveal>
    </section>
  );
}
