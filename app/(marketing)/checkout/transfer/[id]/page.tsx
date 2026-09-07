"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourse } from "@/lib/api/queries/courses";
import { useProfile } from "@/lib/api/queries/profile";

const WALLET_PHONE = "01041966384";

export default function ManualTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coupon = searchParams.get("coupon");
  const { id } = use(params);
  const { data: course, isLoading, isError } = useCourse(id);
  const { data: profile } = useProfile();
  const [copied, setCopied] = useState(false);

  const onCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(WALLET_PHONE);
      setCopied(true);
      toast.success("تم نسخ رقم المحفظة بنجاح 📋");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("يرجى نسخ الرقم يدوياً: " + WALLET_PHONE);
    }
  };

  if (isLoading || !course) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-12">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-body text-muted-foreground">تعذر تحميل بيانات الكورس، يرجى المحاولة لاحقاً.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`/courses/${id}`)}>
          العودة لصفحة الكورس
        </Button>
      </div>
    );
  }

  const priceAmount = (course.price_cents / 100).toLocaleString("ar-EG");
  const whatsappMessage = `السلام عليكم، قمت بتحويل مبلغ ${priceAmount} ${course.currency} للاشتراك في كورس: "${course.title}".\nإيميلي المسجل: ${profile?.email || ""}\nرقم هاتفي: ${profile?.phone || ""}\nمرفق لقطة شاشة لإشعار التحويل لتفعيل الكورس.`;
  const whatsappUrl = `https://wa.me/201041966384?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      {/* Back navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/courses/${id}`}
          className="inline-flex items-center gap-1.5 text-small font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          العودة لتفاصيل الكورس
        </Link>
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold">
          <Sparkles className="me-1 size-3.5" /> الدفع اليدوي عبر المحفظة
        </Badge>
      </div>

      {/* Main Luxury Royal Card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-b from-card via-card/95 to-card/85 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8">
          {/* Header & Course Summary */}
          <div className="border-b border-border/70 pb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              الاشتراك عبر المحفظة الإلكترونية 📱
            </h1>
            <p className="mt-2 text-small text-muted-foreground">
              حوّل قيمة الكورس عبر محفظتك الإلكترونية، وتواصل معنا لتفعيل حسابك في دقائق معدودة.
            </p>

            {/* Course & Price Badge Card */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-muted/30 p-4 sm:p-5 text-start">
              <div>
                <span className="text-caption font-semibold text-muted-foreground">الكورس المطلوب:</span>
                <h2 className="text-base sm:text-lg font-bold text-foreground line-clamp-1">{course.title}</h2>
                {coupon && (
                  <span className="text-caption text-primary font-medium">تم إدخال كود الخصم: {coupon}</span>
                )}
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <span className="text-caption font-medium text-muted-foreground">المبلغ المطلوب تحويله:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-primary">{priceAmount}</span>
                  <span className="text-small font-bold text-foreground">{course.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Phone Number Gold Highlight Box */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 p-6 text-center">
            <span className="text-small font-semibold text-foreground">رقم المحفظة الإلكترونية للتحويل (كاش):</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span dir="ltr" className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-primary">
                {WALLET_PHONE}
              </span>
              <Button
                size="sm"
                variant={copied ? "default" : "outline"}
                className={copied ? "bg-success text-success-foreground" : "border-primary/40 hover:bg-primary/10"}
                onClick={onCopyNumber}
              >
                {copied ? <Check className="me-1.5 size-4" /> : <Copy className="me-1.5 size-4" />}
                {copied ? "تم النسخ!" : "نسخ الرقم"}
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">
              يقبل التحويل من أي محفظة كاش (فودافون كاش، أورنج كاش، اتصالات كاش، وي باي، والمحافظ البنكية الذكية).
            </p>
          </div>

          {/* Simple 3 Steps */}
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-5 text-primary" /> خطوات إتمام التحويل والتفعيل:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-small">
                  1
                </div>
                <h4 className="font-bold text-small text-foreground">افتح محفظتك</h4>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  افتح تطبيق محفظتك الإلكترونية واختر خدمة تحويل الأموال.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-small">
                  2
                </div>
                <h4 className="font-bold text-small text-foreground">حوّل المبلغ</h4>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  حوّل مبلغ <strong className="text-foreground">{priceAmount} {course.currency}</strong> للرقم الموضح بالأعلى.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-small">
                  3
                </div>
                <h4 className="font-bold text-small text-foreground">صوّر الإشعار</h4>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  التقط لقطة شاشة (سكرين شوت) لرسالة أو إشعار نجاح التحويل.
                </p>
              </div>
            </div>
          </div>

          {/* Big WhatsApp CTA Button */}
          <div className="flex flex-col gap-3 pt-2 text-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white py-5 px-6 font-bold text-lg shadow-xl shadow-[#25D366]/20 transition-all hover:scale-[1.01]"
            >
              <MessageCircle className="size-6 fill-white text-[#25D366]" />
              إرسال إشعار التحويل عبر WhatsApp 📲
            </a>
            <p className="text-caption text-muted-foreground">
              الزر يفتح محادثة واتساب فورية مع الدعم مع رسالة مجهزة ببيانات اشتراكك لإرفاق الإشعار.
            </p>
          </div>

          {/* Guarantee and Turnaround Time */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-caption text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary shrink-0" />
              <span>يتم مراجعة الإشعار وتفعيل الكورس على حسابك فوراً خلال دقائق معدودة.</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-4 text-success" />
              <span>اشتراك موثوق ومضمون</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
