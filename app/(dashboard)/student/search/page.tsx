"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Star, GraduationCap, BookOpen, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchCourses, useSearchTeachers } from "@/lib/api/queries/search";

const GRADE_PILLS = [
  { slug: "all", label: "جميع المراحل" },
  { slug: "grade1", label: "أولى ثانوي" },
  { slug: "grade2", label: "ثانية ثانوي" },
  { slug: "grade3", label: "ثالثة ثانوي" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const hasSearchOrFilter = debounced.trim().length > 0 || selectedGrade !== "all";

  const { data: courses, isLoading: coursesLoading } = useSearchCourses(debounced, selectedGrade);
  const { data: teachers, isLoading: teachersLoading } = useSearchTeachers(debounced);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-h2 text-secondary dark:text-white">البحث عن الكورسات والمدرسين</h1>
        <p className="text-small text-muted-foreground mt-1">
          ابحث باسم الكورس، أو حدد مرحلتك الدراسية للوصول لكورساتك ومدرسيك بسهولة.
        </p>
      </div>

      {/* Search Input & Quick Grade Pills */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن كورس، مرحلة دراسية، أو مدرس..."
            className="ps-9"
          />
        </div>

        {/* Grade Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted-foreground me-1">المرحلة الدراسية:</span>
          {GRADE_PILLS.map((pill) => {
            const isSelected = selectedGrade === pill.slug;
            return (
              <button
                key={pill.slug}
                type="button"
                onClick={() => setSelectedGrade(pill.slug)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {pill.slug !== "all" && <GraduationCap className="size-3" />}
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {!hasSearchOrFilter && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <BookOpen className="size-10 stroke-1 text-muted-foreground/60 mb-3" />
          <p className="text-body font-medium text-foreground">ابدأ بالبحث أو اختر مرحلتك الدراسية</p>
          <p className="text-small text-muted-foreground mt-1 max-w-sm">
            يمكنك كتابة اسم الكورس أو المادة، أو الضغط على صفك الدراسي (أولى، ثانية، أو ثالثة ثانوي) لاستعراض الكورسات المتاحة له.
          </p>
        </div>
      )}

      {hasSearchOrFilter && (
        <>
          {/* Courses Section */}
          <section className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h3 text-secondary dark:text-white flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                الكورسات
                {courses && (
                  <span className="text-caption font-normal text-muted-foreground">({courses.length})</span>
                )}
              </h2>
            </div>

            {coursesLoading && (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!coursesLoading && !courses?.length && (
              <p className="py-6 text-center text-small text-muted-foreground bg-muted/20 rounded-xl">
                لا توجد كورسات مطابقة لبحثك في هذه المرحلة.
              </p>
            )}

            {!coursesLoading && !!courses?.length && (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => {
                  const teacherNames = course.teachers
                    ?.map((t) => t.display_name)
                    .filter(Boolean)
                    .join("، ");

                  return (
                    <Link key={course.id} href={`/courses/${course.id}`} className="group block">
                      <Card className="h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 flex flex-col">
                        {course.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="aspect-video w-full object-cover"
                          />
                        ) : (
                          <div className="aspect-video w-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                            <BookOpen className="size-10 opacity-70" />
                          </div>
                        )}

                        <CardContent className="flex flex-1 flex-col justify-between p-4 gap-3">
                          <div className="flex flex-col gap-2">
                            {/* Grade & Subject Badges */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {course.grade_name ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 bg-primary/10 text-primary border border-primary/20 text-caption font-semibold px-2 py-0.5"
                                >
                                  <GraduationCap className="size-3" />
                                  <span>{course.grade_name}</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-caption text-muted-foreground">
                                  مرحلة عامة
                                </Badge>
                              )}

                              {course.subject_name && (
                                <Badge variant="outline" className="text-caption text-muted-foreground font-normal">
                                  {course.subject_name}
                                </Badge>
                              )}
                            </div>

                            {/* Course Title */}
                            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors text-body">
                              {course.title}
                            </h3>

                            {/* Teacher name if present */}
                            {teacherNames && (
                              <p className="flex items-center gap-1 text-caption text-muted-foreground line-clamp-1">
                                <User className="size-3 shrink-0" />
                                <span>{teacherNames}</span>
                              </p>
                            )}
                          </div>

                          {/* Price & Rating Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-small">
                            <span className="font-bold text-foreground">
                              {course.price_cents === 0
                                ? "مجاني"
                                : `${(course.price_cents / 100).toLocaleString("ar-EG")} ${course.currency}`}
                            </span>

                            {course.rating_avg != null && (
                              <div className="flex items-center gap-1 text-caption font-medium text-amber-500">
                                <Star className="size-3.5 fill-amber-500" />
                                <span>{course.rating_avg.toFixed(1)}</span>
                                {course.rating_count ? (
                                  <span className="text-muted-foreground">({course.rating_count})</span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Teachers Section (only if text query is entered) */}
          {debounced && (
            <section className="w-full mt-4">
              <h2 className="mb-4 text-h3 text-secondary dark:text-white flex items-center gap-2">
                <User className="size-5 text-primary" />
                المدرسون
              </h2>
              {teachersLoading && <Skeleton className="h-24 w-full rounded-xl" />}
              {!teachersLoading && !teachers?.length && (
                <p className="text-small text-muted-foreground">لا يوجد مدرسون مطابقون للاسم المكتوب.</p>
              )}
              {!teachersLoading && !!teachers?.length && (
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((teacher) => (
                    <Link key={teacher.teacher_id} href={`/teachers/${teacher.teacher_id}`}>
                      <Card className="w-full transition-shadow hover:shadow-md hover:border-primary/40">
                        <CardContent className="flex items-center gap-3 p-4">
                          {teacher.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={teacher.photo_url}
                              alt={teacher.display_name}
                              className="size-12 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                              {teacher.display_name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate">{teacher.display_name}</h3>
                            {teacher.rating_avg != null && (
                              <div className="mt-1 flex items-center gap-1 text-caption text-amber-500">
                                <Star className="size-3 fill-amber-500" />
                                <span>{teacher.rating_avg.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
