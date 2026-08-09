"use client";

import { use, useEffect } from "react";
import Image from "next/image";
import { Star, BookOpen, GraduationCap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/marketing/CourseCard";
import { ReviewsSection } from "@/components/marketing/ReviewsSection";
import { useTeacher, getTeacherProfile } from "@/lib/api/queries/teachers";
import { useCoursesByTeacher } from "@/lib/api/queries/courses";
import { JsonLd } from "@/components/shared/JsonLd";
import { cn } from "@/lib/utils";
import {
  useWishlistTeachers,
  useAddWishlistTeacher,
  useRemoveWishlistTeacher,
} from "@/lib/api/queries/wishlist";
import { useProfile } from "@/lib/api/queries/profile";

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: teacher, isLoading, isError } = useTeacher(id);
  const { data: courses, isLoading: coursesLoading } = useCoursesByTeacher(id);
  const profile = teacher ? getTeacherProfile(teacher) : null;
  const { data: currentUser } = useProfile();
  const { data: wishlistTeachers } = useWishlistTeachers({ enabled: !!currentUser });
  const addWishlist = useAddWishlistTeacher();
  const removeWishlist = useRemoveWishlistTeacher();
  const isWishlisted = !!wishlistTeachers?.some((w) => w.teacher_id === id);
  const onToggleWishlist = () => {
    if (isWishlisted) removeWishlist.mutate(id);
    else addWishlist.mutate(id);
  };

  useEffect(() => {
    if (profile?.display_name) document.title = `${profile.display_name} | Goglish`;
  }, [profile]);

  // A teacher whose profile is still incomplete (no display_name yet - the
  // auto-create trigger only sets teacher_id) isn't ready for a public page.
  if (isError || (!isLoading && teacher && !profile?.display_name)) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-small text-muted-foreground">تعذر تحميل بيانات المدرس.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {isLoading || !profile ? (
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "Person",
              name: profile.display_name,
              description: profile.bio ?? undefined,
              image: profile.photo_url ?? undefined,
              jobTitle: "مدرس",
              ...(profile.rating_avg != null && profile.rating_count
                ? {
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: profile.rating_avg,
                      reviewCount: profile.rating_count,
                    },
                  }
                : {}),
            }}
          />
          <div className="flex w-full flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-start">
            {profile.photo_url ? (
              <Image
                src={profile.photo_url}
                alt={profile.display_name}
                width={96}
                height={96}
                className="size-24 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-muted text-h2 text-muted-foreground">
                {profile.display_name.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-h2 text-secondary dark:text-white">{profile.display_name}</h1>
              {profile.bio && <p className="mt-2 text-small text-muted-foreground">{profile.bio}</p>}

              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-small text-muted-foreground sm:justify-start">
                {profile.rating_avg != null && (
                  <span className="flex items-center gap-1">
                    <Star className="size-4 fill-primary text-primary" />
                    {profile.rating_avg.toFixed(1)} ({profile.rating_count ?? 0} تقييم)
                  </span>
                )}
                {profile.experience_years != null && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="size-4" />
                    {profile.experience_years} سنة خبرة
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen className="size-4" />
                  {courses?.length ?? 0} كورس
                </span>
              </div>

              {currentUser && (
                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  disabled={addWishlist.isPending || removeWishlist.isPending}
                  onClick={onToggleWishlist}
                >
                  <Heart className={cn("size-4", isWishlisted && "fill-destructive text-destructive")} />
                  {isWishlisted ? "إزالة من المفضلة" : "أضف للمفضلة"}
                </Button>
              )}
            </div>
          </div>

          <section className="mt-10 w-full">
            <h2 className="text-h3 text-secondary dark:text-white">كورسات المدرس</h2>
            <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coursesLoading &&
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
              {!coursesLoading &&
                courses?.map((course) => <CourseCard key={course.id} course={course} showTeacher={false} />)}
            </div>
            {!coursesLoading && !courses?.length && (
              <p className="mt-4 text-small text-muted-foreground">لا يوجد كورسات لهذا المدرس حالياً.</p>
            )}
          </section>

          <section className="mt-10 w-full">
            <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
              <Star className="size-5 text-primary" />
              تقييمات المدرس
            </h2>
            <div className="mt-4 w-full">
              <ReviewsSection targetType="teacher" targetId={id} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
