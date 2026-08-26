"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth.schemas";
import { postJson } from "@/lib/api/client-fetch";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthCard } from "../_components/AuthCard";
import { Field, FormMessage, SubmitButton } from "../_components/Field";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    // /auth/callback already exchanged the recovery code server-side and set
    // the session cookie before redirecting here, so just asking the server
    // "am I authenticated?" is enough. This deliberately goes through the
    // API rather than the browser Supabase client: the session cookie is
    // httpOnly (see lib/supabase/server.ts), so client-side getUser() can't
    // see it and would always report "no session" here.
    fetch("/api/profile")
      .then((res) => setSessionReady(res.ok))
      .catch(() => setSessionReady(false));
  }, []);

  const onSubmit = async (values: ResetPasswordInput) => {
    const result = await postJson("/api/auth/reset-password", values);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <AuthCard title="إعادة تعيين الباسورد">
      {sessionReady === null ? (
        <p className="text-small">جاري التحقق من الرابط...</p>
      ) : !sessionReady ? (
        <FormMessage kind="error" text="الرابط غير صالح أو منتهي الصلاحية، اطلب رابط جديد" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="الباسورد الجديد" htmlFor="password" error={errors.password?.message}>
            <PasswordInput id="password" aria-invalid={!!errors.password} {...register("password")} />
          </Field>

          <Field
            label="تأكيد الباسورد"
            htmlFor="confirm_password"
            error={errors.confirm_password?.message}
          >
            <PasswordInput
              id="confirm_password"
              aria-invalid={!!errors.confirm_password}
              {...register("confirm_password")}
            />
          </Field>

          <SubmitButton disabled={isSubmitting}>تغيير الباسورد</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
