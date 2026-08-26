"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchCourses, useSearchTeachers } from "@/lib/api/queries/search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: courses, isLoading: coursesLoading } = useSearchCourses(debounced);
  const { data: teachers, isLoading: teachersLoading } = useSearchTeachers(debounced);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">البحث</h1>

      <div className="relative w-full max-w-xl">
        <SearchIcon className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن كورس أو مدرس..."
          className="ps-9"
        />
      </div>

      {!debounced && <p className="text-small text-muted-foreground">اكتب عشان تبدأ البحث.</p>}

      {debounced && (
        <>
          <section className="w-full">
            <h2 className="mb-4 text-h3 text-secondary dark:text-white">الكورسات</h2>
            {coursesLoading && <Skeleton className="h-20 w-full rounded-xl" />}
            {!coursesLoading && !courses?.length && (
              <p className="text-small text-muted-foreground">مفيش كورسات مطابقة.</p>
            )}
            {!coursesLoading && !!courses?.length && (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <Link key={course.id} href={`/courses/${course.id}`}>
                    <Card className="w-full transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground">{course.title}</h3>
                        {course.rating_avg != null && (
                          <div className="mt-1 flex items-center gap-1 text-small text-muted-foreground">
                            <Star className="size-3.5 fill-primary text-primary" />
                            {course.rating_avg.toFixed(1)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="w-full">
            <h2 className="mb-4 text-h3 text-secondary dark:text-white">المدرسون</h2>
            {teachersLoading && <Skeleton className="h-20 w-full rounded-xl" />}
            {!teachersLoading && !teachers?.length && (
              <p className="text-small text-muted-foreground">مفيش مدرسين مطابقين.</p>
            )}
            {!teachersLoading && !!teachers?.length && (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teachers.map((teacher) => (
                  <Link key={teacher.teacher_id} href={`/teachers/${teacher.teacher_id}`}>
                    <Card className="w-full transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground">{teacher.display_name}</h3>
                        {teacher.rating_avg != null && (
                          <div className="mt-1 flex items-center gap-1 text-small text-muted-foreground">
                            <Star className="size-3.5 fill-primary text-primary" />
                            {teacher.rating_avg.toFixed(1)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
