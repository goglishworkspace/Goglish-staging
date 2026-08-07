"use client";

import { useTeachers } from "@/lib/api/queries/teachers";
import { TeacherCard } from "@/components/landing/TeacherCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeachersPage() {
  const { data: teachers, isLoading, isError } = useTeachers();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-h2 text-secondary dark:text-white">المدرسون</h1>

      <div className="mt-8 grid w-full grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 rounded-xl p-4">
              <Skeleton className="size-20 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}

        {!isLoading && isError && (
          <p className="col-span-full text-center text-small text-muted-foreground">
            تعذر تحميل بيانات المدرسين حالياً.
          </p>
        )}

        {!isLoading && !isError && teachers?.length === 0 && (
          <p className="col-span-full text-center text-small text-muted-foreground">
            لا يوجد مدرسون منشورون حالياً.
          </p>
        )}

        {!isLoading &&
          !isError &&
          teachers?.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
      </div>
    </div>
  );
}
