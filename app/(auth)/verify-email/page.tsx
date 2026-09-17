"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthCard } from "../_components/AuthCard";
import { FormMessage } from "../_components/Field";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return (
    <AuthCard title="تفعيل الحساب فوري 🎓">
      <div className="flex flex-col gap-4">
        <FormMessage
          kind="success"
          text="تم تفعيل نظام الدخول الفوري لجميع الحسابات! لم تعد بحاجة لتأكيد البريد الإلكتروني."
        />

        <p className="text-small text-muted-foreground text-center">
          {email ? `حسابك (${email}) جاهز للاستخدام مباشرة.` : "حسابك جاهز للاستخدام مباشرة."}
        </p>

        <Link href="/login" className={cn(buttonVariants(), "w-full text-center")}>
          تسجيل الدخول الآن 🚀
        </Link>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="تأكيد بريدك الإلكتروني">{null}</AuthCard>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
