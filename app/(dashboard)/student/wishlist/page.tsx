"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWishlistCourses,
  useWishlistTeachers,
  useRemoveWishlistCourse,
  useRemoveWishlistTeacher,
} from "@/lib/api/queries/wishlist";

export default function WishlistPage() {
  const { data: courses, isLoading: coursesLoading } = useWishlistCourses();
  const { data: teachers, isLoading: teachersLoading } = useWishlistTeachers();
  const removeCourse = useRemoveWishlistCourse();
  const removeTeacher = useRemoveWishlistTeacher();

  return (
    <div className="flex w-full flex-col gap-8">
      <h1 className="text-h2 text-secondary dark:text-white">المفضلة</h1>

      <section className="w-full">
        <h2 className="mb-4 text-h3 text-secondary dark:text-white">الكورسات المفضّلة</h2>
        {coursesLoading && <Skeleton className="h-24 w-full rounded-xl" />}
        {!coursesLoading && !courses?.length && (
          <p className="text-small text-muted-foreground">لا يوجد كورسات مفضّلة بعد.</p>
        )}
        {!coursesLoading && !!courses?.length && (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((item) =>
              item.courses ? (
                <Card key={item.course_id} className="w-full">
                  <CardContent className="flex items-center justify-between gap-2 p-4">
                    <Link href={`/courses/${item.courses.id}`} className="min-w-0 flex-1 truncate font-medium">
                      {item.courses.title}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="إزالة من المفضلة"
                      onClick={() => removeCourse.mutate(item.course_id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section className="w-full">
        <h2 className="mb-4 flex items-center gap-2 text-h3 text-secondary dark:text-white">
          <Heart className="size-5 text-primary" />
          المدرسون المفضّلون
        </h2>
        {teachersLoading && <Skeleton className="h-24 w-full rounded-xl" />}
        {!teachersLoading && !teachers?.length && (
          <p className="text-small text-muted-foreground">لا يوجد مدرسون مفضّلون بعد.</p>
        )}
        {!teachersLoading && !!teachers?.length && (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((item) =>
              item.teachers?.teacher_profiles ? (
                <Card key={item.teacher_id} className="w-full">
                  <CardContent className="flex items-center justify-between gap-2 p-4">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.teachers.teacher_profiles.display_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="إزالة من المفضلة"
                      onClick={() => removeTeacher.mutate(item.teacher_id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ) : null,
            )}
          </div>
        )}
      </section>
    </div>
  );
}
