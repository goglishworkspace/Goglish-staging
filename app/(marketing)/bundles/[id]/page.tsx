"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PlayCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/marketing/CourseCard";
import { useBundle, bundleCourseList } from "@/lib/api/queries/bundles";
import { postJson } from "@/lib/api/client-fetch";

export default function BundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: bundle, isLoading, isError } = useBundle(id);
  const [enrolling, setEnrolling] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    if (bundle) document.title = `${bundle.title} | Goglish`;
  }, [bundle]);

  const onEnroll = async () => {
    setEnrolling(true);
    try {
      const order = await postJson<{ id: string }>("/api/orders", {
        item_type: "bundle",
        item_id: id,
        ...(couponCode.trim() ? { coupon_code: couponCode.trim() } : {}),
      });
      if (!order.success) {
        toast.error(order.message);
        return;
      }

      const payment = await postJson<{ checkout_url: string }>(`/api/orders/${order.data.id}/pay`, {
        provider: process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_PROVIDER || "stripe",
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
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-small text-muted-foreground">تعذر تحميل الباقة.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {isLoading || !bundle ? (
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Badge className="w-fit gap-1">
                <Package className="size-3" />
                باقة
              </Badge>
              <h1 className="mt-2 text-h2 text-secondary dark:text-white">{bundle.title}</h1>
              {bundle.description && (
                <p className="mt-2 text-body text-muted-foreground">{bundle.description}</p>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-56 sm:shrink-0">
              {bundle.has_access ? (
                <Button className="w-full" nativeButton={false} render={<Link href="#bundle-courses" />}>
                  <PlayCircle />
                  متابعة التعلم
                </Button>
              ) : (
                <>
                  <p className="text-h3 text-secondary dark:text-white">
                    {bundle.price_cents === 0
                      ? "مجاني"
                      : `${(bundle.price_cents / 100).toLocaleString("ar-EG")} ${bundle.currency}`}
                  </p>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="كود الخصم (اختياري)"
                    aria-label="كود الخصم"
                  />
                  <Button className="w-full" disabled={enrolling} onClick={onEnroll}>
                    {enrolling ? "جاري التحضير..." : "اشترك في الباقة"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <section id="bundle-courses" className="mt-10 w-full scroll-mt-20">
            <h2 className="text-h3 text-secondary dark:text-white">تشمل الباقة دي</h2>
            <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Same CourseCard used on the teacher-profile/courses pages -
                  it links to /courses/[id], which does its own access check,
                  so a course a student hasn't unlocked yet still shows the
                  normal "purchase required" state rather than this page
                  needing to special-case it. */}
              {bundleCourseList(bundle).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
