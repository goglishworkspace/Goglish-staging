"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useHonorBoard } from "@/lib/api/queries/honor-board";
import { HonorBoardPodium } from "./HonorBoardPodium";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "./Reveal";
import { SectionEyebrow } from "./SectionEyebrow";

export function HonorBoardSection() {
  const { data: entries, isLoading, isError } = useHonorBoard(3);

  return (
    <section id="honor-board" className="w-full px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <SectionEyebrow>الأبطال</SectionEyebrow>
            <h2 className="text-h2 text-secondary dark:text-white">لوحة الشرف</h2>
          </div>
          <Link
            href="/honor-board"
            className="flex items-center gap-1 text-small font-medium text-info hover:underline"
          >
            الترتيب الكامل
            <ChevronLeft className="size-4" />
          </Link>
        </div>
        <p className="mt-2 text-small text-muted-foreground">أعلى 3 طلاب في مجموع كل المواد</p>

        <div className="mt-8 w-full">
          {isLoading && <Skeleton className="h-72 w-full rounded-3xl" />}

          {!isLoading && (isError || !entries?.length) && (
            <p className="text-center text-small text-muted-foreground">لوحة الشرف غير متاحة حالياً.</p>
          )}

          {!isLoading && !isError && !!entries?.length && <HonorBoardPodium entries={entries} />}
        </div>
      </Reveal>
    </section>
  );
}
