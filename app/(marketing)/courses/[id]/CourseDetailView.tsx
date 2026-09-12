"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  PlayCircle,
  Heart,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Sparkles,
  BookOpen,
  User,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

export function CourseDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: course, isLoading, isError } = useCourse(id);
  const { data: progress } = useCourseProgress(id, { enabled: !!course?.has_access });
  const [enrolling, setEnrolling] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"gateway" | "manual_wallet">("gateway");

  const { data: profile } = useProfile();
  const { data: wishlistCourses } = useWishlistCourses({ enabled: !!profile });
  const addWishlist = useAddWishlistCourse();
  const removeWishlist = useRemoveWishlistCourse();
  const isWishlisted = !!wishlistCourses?.some((w) => w.course_id === id);

  const onToggleWishlist = () => {
    if (isWishlisted) removeWishlist.mutate(id);
    else addWishlist.mutate(id);
  };

  useEffect(() => {
    if (course) document.title = `${course.title} | Goglish`;
  }, [course]);

  const onEnroll = async () => {
    // If manual wallet is selected, redirect to the royal manual transfer page
    if (paymentMethod === "manual_wallet") {
      router.push(`/checkout/transfer/${id}${couponCode.trim() ? `?coupon=${encodeURIComponent(couponCode.trim())}` : ""}`);
      return;
    }

    // Otherwise, proceed with the online gateway (Kashier - Visa / Wallet)
    setEnrolling(true);
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
        provider: "kasher",
      });
      if (!payment.success) {
        toast.error(payment.message);
        return;
      }

      window.location.href = payment.data.checkout_url;
    } catch {
      toast.error("حصل خطأ غير متوقع، حاول تاني");
    } finally {
      setEnrolling(false);
    }
  };

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center">
        <p className="text-body text-muted-foreground">تعذر تحميل الكورس، يرجى المحاولة لاحقاً.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {isLoading || !course ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 w-full rounded-2xl lg:col-span-2" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
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

          {/* Top Hero Banner Card */}
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-card/90 via-card/60 to-card/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-primary/5 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
                  <Sparkles className="me-1 size-3.5" /> كورس معتمد
                </Badge>
                {course.has_access && (
                  <Badge variant="default" className="bg-success text-success-foreground px-3 py-1 text-caption font-semibold">
                    <CheckCircle2 className="me-1 size-3.5" /> أنت مشترك في هذا الكورس
                  </Badge>
                )}
              </div>

              <h1 className="text-h1 font-black tracking-tight text-foreground sm:text-4xl">
                {course.title}
              </h1>

              {course.description && (
                <p className="max-w-3xl text-body leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              )}

              {!!course.teachers.length && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-4 py-1.5 backdrop-blur-md">
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <User className="size-4" />
                    </div>
                    <span className="text-small text-muted-foreground">المدرّس:</span>
                    {course.teachers.map((teacher, i) => (
                      <span key={teacher.id}>
                        {i > 0 && "، "}
                        <Link
                          href={`/teachers/${teacher.id}`}
                          className="font-bold text-foreground transition-colors hover:text-primary underline"
                        >
                          {teacher.display_name ?? "مدرّس Goglish"}
                        </Link>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Grid: Content (Right in RTL) & Checkout Card (Left in RTL) */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Right Column: Video + Curriculum + Reviews */}
            <div className="flex flex-col gap-8 lg:col-span-2">
              {course.trailer_youtube_id && (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xl backdrop-blur-md">
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
                    <PlayCircle className="size-5 text-primary" /> الفيديو التعريفي للكورس
                  </h3>
                  <div className="overflow-hidden rounded-xl">
                    <YouTubePlayer videoId={course.trailer_youtube_id} title="فيديو تشويقي للكورس" />
                  </div>
                </div>
              )}

              {/* Course Curriculum / Modules Card */}
              <div id="course-content" className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-xl backdrop-blur-md">
                <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
                  <h2 className="flex items-center gap-2.5 text-h3 font-bold text-foreground">
                    <BookOpen className="size-6 text-primary" />
                    محتوى الكورس والدروس
                  </h2>
                </div>
                <CourseModules courseId={course.id} hasAccess={course.has_access} />
              </div>

              {/* Exams Card if student has access */}
              {course.has_access && (
                <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-xl backdrop-blur-md">
                  <h2 className="mb-4 text-h3 font-bold text-foreground">امتحانات واختبارات الكورس</h2>
                  <CourseExams courseId={course.id} />
                </div>
              )}

              {/* Reviews Card */}
              <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-xl backdrop-blur-md">
                <h2 className="mb-6 flex items-center gap-2.5 text-h3 font-bold text-foreground">
                  <Star className="size-6 fill-primary text-primary" />
                  تقييمات وآراء الطلاب
                </h2>
                <ReviewsSection targetType="course" targetId={course.id} />
              </div>
            </div>

            {/* Left Column: Sticky Luxury Checkout Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 flex flex-col gap-6">
                <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-b from-card via-card/95 to-card/80 p-6 shadow-2xl backdrop-blur-xl">
                  <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/10 blur-2xl" />

                  {course.has_access ? (
                    <div className="flex flex-col gap-4 text-center">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/20 text-success">
                        <CheckCircle2 className="size-8" />
                      </div>
                      <h3 className="text-h3 font-bold text-foreground">أنت مشترك بالفعل</h3>
                      <p className="text-small text-muted-foreground">
                        يمكنك الآن متابعة مشاهدة الدروس وحل التمارين والاختبارات في أي وقت.
                      </p>
                      <Button
                        size="lg"
                        className="w-full font-bold text-base py-6 shadow-lg shadow-primary/20"
                        nativeButton={false}
                        render={<Link href={progress?.next_lesson_id ? `/lessons/${progress.next_lesson_id}` : "#course-content"} />}
                      >
                        <PlayCircle className="me-2 size-5" />
                        متابعة التعلم
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {/* Price Tag */}
                      <div className="flex items-baseline justify-between border-b border-border/60 pb-4">
                        <span className="text-small font-medium text-muted-foreground">سعر الكورس:</span>
                        <div className="text-start">
                          <span className="text-3xl font-black text-primary">
                            {course.price_cents === 0
                              ? "مجاني"
                              : (course.price_cents / 100).toLocaleString("ar-EG")}
                          </span>
                          {course.price_cents > 0 && (
                            <span className="ms-1.5 text-small font-bold text-foreground">
                              {course.currency}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Coupon Input */}
                      {course.price_cents > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="coupon" className="text-caption font-medium text-muted-foreground">
                            كود الخصم (اختياري)
                          </label>
                          <div className="relative">
                            <Tag className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="coupon"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder="أدخل كود الخصم إذا كان لديك..."
                              className="ps-9 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Payment Method Selector */}
                      {course.price_cents > 0 && (
                        <div className="flex flex-col gap-2.5">
                          <span className="text-caption font-semibold text-foreground">طريقة الدفع:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Option 1: Electronic Gateway (Visa / Wallet) */}
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("gateway")}
                              className={cn(
                                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3.5 text-center transition-all cursor-pointer",
                                paymentMethod === "gateway"
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/50",
                              )}
                            >
                              <CreditCard className={cn("size-5", paymentMethod === "gateway" ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-xs font-bold text-foreground leading-tight">فيزا / محفظة</span>
                              <span className="text-[10px] text-muted-foreground">دفع إلكتروني فوري</span>
                            </button>

                            {/* Option 2: Manual Wallet Transfer */}
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("manual_wallet")}
                              className={cn(
                                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3.5 text-center transition-all cursor-pointer relative",
                                paymentMethod === "manual_wallet"
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/50",
                              )}
                            >
                              <Smartphone className={cn("size-5", paymentMethod === "manual_wallet" ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-xs font-bold text-foreground leading-tight">محفظة</span>
                              <span className="text-[10px] text-primary font-semibold">تحويل يدوي كاش</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Main Action Button */}
                      <Button
                        size="lg"
                        className="w-full py-6 text-base font-bold shadow-xl shadow-primary/25 transition-all hover:scale-[1.01]"
                        disabled={enrolling}
                        onClick={onEnroll}
                      >
                        {enrolling
                          ? "جاري التحضير..."
                          : paymentMethod === "manual_wallet"
                            ? "متابعة للدفع عبر المحفظة 📲"
                            : "اشترك الآن 🚀"}
                      </Button>

                      {/* Guarantee and Perks */}
                      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-caption text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" />
                          <span>وصول فوري وشامل لجميع محاضرات الكورس</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          <span>جودة تصوير عالية Full HD مع امتحانات دورية</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wishlist Button */}
                  {profile && (
                    <Button
                      variant="outline"
                      className="mt-4 w-full border-border/80 hover:bg-muted/50"
                      disabled={addWishlist.isPending || removeWishlist.isPending}
                      onClick={onToggleWishlist}
                    >
                      <Heart className={cn("me-2 size-4", isWishlisted && "fill-destructive text-destructive")} />
                      {isWishlisted ? "إزالة من قائمة الرغبات" : "أضف للمفضلة"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
