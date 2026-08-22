"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star, PlayCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourse } from "@/lib/api/queries/courses";
import { useCourseProgress } from "@/lib/api/queries/lesson-progress";
import { postJson } from "@/lib/api/client-fetch";
import { CourseModules } from "@/components/marketing/CourseModules";
import { ReviewsSection } from "@/components/marketing/ReviewsSection";
import { CourseExams } from "@/components/marketing/CourseExams";
import { JsonLd } from "@/components/shared/JsonLd";
import { YouTubePlayer } from "@/components/shared/YouTubePlayer";
import { cn } from "@/lib/utils";
import {
  useWishlistCourses,
  useAddWishlistCourse,
  useRemoveWishlistCourse,
} from "@/lib/api/queries/wishlist";
import { useProfile } from "@/lib/api/queries/profile";

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: course, isLoading, isError } = useCourse(id);
  const { data: progress } = useCourseProgress(id, { enabled: !!course?.has_access });
  const [enrolling, setEnrolling] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [provider, setProvider] = useState<"kasher" | "daffaa">(
    (process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_PROVIDER as "kasher" | "daffaa") || "kasher",
  );
  const { data: profile } = useProfile();
  const { data: wishlistCourses } = useWishlistCourses({ enabled: !!profile });
  const addWishlist = useAddWishlistCourse();
  const removeWishlist = useRemoveWishlistCourse();
  const isWishlisted = !!wishlistCourses?.some((w) => w.course_id === id);
  const onToggleWishlist = () => {
    if (isWishlisted) removeWishlist.mutate(id);
    else addWishlist.mutate(id);
  };

  // This page is fully client-rendered (data depends on the logged-in
  // user's has_access), so the static layout.tsx title ("الكورس") is only
  // a fallback until the real title loads - Next can't statically know a
  // per-course title here the way generateMetadata would on a server page.
  useEffect(() => {
    if (course) document.title = `${course.title} | Goglish`;
  }, [course]);

  const onEnroll = async () => {
    setEnrolling(true);
    // try/finally so `enrolling` always clears - without it, any unexpected
    // exception here (not just an order.success/payment.success failure)
    // left the button stuck on "جاري التحضير..." forever with no error
    // shown, since execution never reached the setEnrolling(false) calls.
    try {
      const order = await postJson<{ id: string }>("/api/orders", {
        item_type: "course",
        item_id: id,
        ...(couponCode.trim() ? { coupon_code: couponCode.trim() } : {}),
      });
      if (!order.success) {
        toast.error(order.message);
        return;
      }

      const payment = await postJson<{ checkout_url: string }>(`/api/orders/${order.data.id}/pay`, {
        provider,
      });
      if (!payment.success) {
        toast.error(payment.message);
        return;
      }

      // A real payment provider redirect leaves the SPA entirely, so this
      // never mattered there - but a free course (or one discounted to zero
      // by a coupon) never leaves this page at all; router.push() to the
      // same route with just a new query string doesn't refetch useCourse()'s
      // React Query cache, so the page kept showing "اشترك الآن" as if
      // nothing happened even though the purchase succeeded. A full
      // navigation forces everything (access state included) to load fresh.
      window.location.href = payment.data.checkout_url;
    } catch {
      toast.error("حصل خطأ غير متوقع، حاول تاني");
    } finally {
      setEnrolling(false);
    }
  };

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-small text-muted-foreground">تعذر تحميل الكورس.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {isLoading || !course ? (
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "Course",
              name: course.title,
              description: course.description ?? course.title,
              provider: { "@type": "Organization", name: "Goglish", sameAs: process.env.NEXT_PUBLIC_SITE_URL },
              offers: {
                "@type": "Offer",
                price: (course.price_cents / 100).toFixed(2),
                priceCurrency: course.currency,
                availability: "https://schema.org/InStock",
              },
            }}
          />
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-h2 text-secondary dark:text-white">{course.title}</h1>
              {!!course.teachers.length && (
                <p className="mt-1 text-small text-muted-foreground">
                  المدرّس:{" "}
                  {course.teachers.map((teacher, i) => (
                    <span key={teacher.id}>
                      {i > 0 && "، "}
                      <Link href={`/teachers/${teacher.id}`} className="font-medium text-foreground underline">
                        {teacher.display_name ?? "مدرّس"}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              {course.description && (
                <p className="mt-2 text-body text-muted-foreground">{course.description}</p>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-56 sm:shrink-0">
              {course.has_access ? (
                <Button
                  className="w-full"
                  nativeButton={false}
                  render={<Link href={progress?.next_lesson_id ? `/lessons/${progress.next_lesson_id}` : "#course-content"} />}
                >
                  <PlayCircle />
                  متابعة التعلم
                </Button>
              ) : (
                <>
                  <p className="text-h3 text-secondary dark:text-white">
                    {course.price_cents === 0
                      ? "مجاني"
                      : `${(course.price_cents / 100).toLocaleString("ar-EG")} ${course.currency}`}
                  </p>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="كود الخصم (اختياري)"
                    aria-label="كود الخصم"
                  />
                  {course.price_cents > 0 && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant={provider === "kasher" ? "default" : "outline"}
                        onClick={() => setProvider("kasher")}
                      >
                        كاشير
                      </Button>
                      <Button
                        className="flex-1"
                        variant={provider === "daffaa" ? "default" : "outline"}
                        onClick={() => setProvider("daffaa")}
                      >
                        محفظة / إنستاباي
                      </Button>
                    </div>
                  )}
                  <Button className="w-full" disabled={enrolling} onClick={onEnroll}>
                    {enrolling ? "جاري التحضير..." : "اشترك الآن"}
                  </Button>
                </>
              )}
              {profile && (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={addWishlist.isPending || removeWishlist.isPending}
                  onClick={onToggleWishlist}
                >
                  <Heart className={cn("size-4", isWishlisted && "fill-destructive text-destructive")} />
                  {isWishlisted ? "إزالة من المفضلة" : "أضف للمفضلة"}
                </Button>
              )}
            </div>
          </div>

          {course.trailer_youtube_id && (
            <section className="mt-8 w-full">
              <YouTubePlayer videoId={course.trailer_youtube_id} title="فيديو تشويقي للكورس" />
            </section>
          )}

          <section id="course-content" className="mt-10 w-full scroll-mt-20">
            <h2 className="text-h3 text-secondary dark:text-white">محتوى الكورس</h2>
            <div className="mt-4 w-full">
              <CourseModules courseId={course.id} hasAccess={course.has_access} />
            </div>
          </section>

          {course.has_access && (
            <section className="mt-10 w-full">
              <h2 className="text-h3 text-secondary dark:text-white">امتحانات الكورس</h2>
              <div className="mt-4 w-full">
                <CourseExams courseId={course.id} />
              </div>
            </section>
          )}

          <section className="mt-10 w-full">
            <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
              <Star className="size-5 text-primary" />
              التقييمات
            </h2>
            <div className="mt-4 w-full">
              <ReviewsSection targetType="course" targetId={course.id} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
