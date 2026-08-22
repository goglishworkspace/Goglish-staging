"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCourses } from "@/lib/api/queries/courses";
import { CourseCard } from "@/components/marketing/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { SectionEyebrow } from "./SectionEyebrow";

const HOMEPAGE_COURSE_LIMIT = 10;
const VISIBLE_CARDS = 4;
const SCROLL_CARDS = 3;

export function CoursesSection() {
  const { data: courses, isLoading, isError } = useCourses({ limit: HOMEPAGE_COURSE_LIMIT });
  const scrollerRef = useRef<HTMLDivElement>(null);
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
  }, [courses]);

  const scrollByCards = (cards: number) => {
    scrollerRef.current?.scrollBy({ left: cardStep * cards, behavior: "smooth" });
  };

  return (
    <section id="courses" className="w-full px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <SectionEyebrow>الكورسات</SectionEyebrow>
            <h2 className="text-h2 text-secondary dark:text-white">أحدث الكورسات</h2>
          </div>
          {!isLoading && !isError && !!courses?.length && (
            <div className="flex items-center gap-3">
              <Link
                href="/courses"
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
              <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-xl sm:w-72" />
            ))}

          {!isLoading && isError && (
            <p className="w-full text-center text-small text-muted-foreground">تعذر تحميل الكورسات حالياً.</p>
          )}

          {!isLoading && !isError && courses?.length === 0 && (
            <p className="w-full text-center text-small text-muted-foreground">لا يوجد كورسات منشورة حالياً.</p>
          )}

          {!isLoading &&
            !isError &&
            courses?.map((course) => (
              <div key={course.id} className="w-64 shrink-0 sm:w-72">
                <CourseCard course={course} />
              </div>
            ))}
        </div>
      </Reveal>
    </section>
  );
}
