"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthCard } from "../_components/AuthCard";
import { FormMessage } from "../_components/Field";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [status, setStatus] = useState<"checking" | "waiting" | "confirmed">("checking");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Asks the server rather than the browser Supabase client: the session
    // cookie is httpOnly (see lib/supabase/server.ts), so a client-side
    // getUser() can't read it and would always report "no session".
    //
    // A live session in this browser might belong to a *different* account
    // (e.g. someone registering a second account in the same browser right
    // after confirming the first) - only treat this specific registration
    // as confirmed when the session's email actually matches, or when no
    // email was passed at all (the older, non-email-bearing landing flow
    // this page also still serves).
    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) return setStatus("waiting");
        const json = await res.json();
        const sessionEmail = json?.data?.email as string | undefined;
        setStatus(!email || sessionEmail === email ? "confirmed" : "waiting");
      })
      .catch(() => setStatus("waiting"));
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onResend = async () => {
    if (!email) {
      toast.error("مفيش إيميل لإعادة الإرسال إليه");
      return;
    }
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إعادة إرسال رابط التفعيل");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <AuthCard title="تأكيد بريدك الإلكتروني">
      {status === "checking" && <p className="text-small">جاري التحقق...</p>}

      {status === "confirmed" && (
        <div className="flex flex-col gap-4">
          <FormMessage kind="success" text="تم تأكيد إيميلك بنجاح، تقدر دلوقتي تسجل دخول" />
          <Link href="/login" className="text-center font-semibold underline">
            سجّل دخول
          </Link>
        </div>
      )}

      {status === "waiting" && (
        <div className="flex flex-col gap-4">
          <p className="text-small text-muted-foreground">
            {email ? `أرسلنا رابط تفعيل إلى ${email}` : "أرسلنا رابط تفعيل إلى إيميلك"}
          </p>

          <div
            dir="rtl"
            className="flex items-start gap-2 rounded-lg bg-amber-100 p-4 text-small text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
          >
            <Mail className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              إذا لم تجد الرسالة في صندوق الوارد، تحقق من مجلد الـ Spam أو Junk Mail — أحياناً تصل
              الرسائل هناك.
            </p>
          </div>

          <Button className="w-full" disabled={resending || cooldown > 0} onClick={onResend}>
            {cooldown > 0 ? `أعد الإرسال بعد ${cooldown} ثانية` : resending ? "جاري الإرسال..." : "إعادة إرسال الإيميل"}
          </Button>

          <Link href="/login" className="text-center text-small underline">
            سجّل دخول
          </Link>
        </div>
      )}
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
