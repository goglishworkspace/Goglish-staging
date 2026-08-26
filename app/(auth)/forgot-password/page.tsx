"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth.schemas";
import { postJson } from "@/lib/api/client-fetch";
import { Input } from "@/components/ui/input";
import { AuthCard } from "../_components/AuthCard";
import { Field, SubmitButton } from "../_components/Field";

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    const result = await postJson("/api/auth/forgot-password", values);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AuthCard title="نسيت الباسورد">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="الإيميل" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>

        <SubmitButton disabled={isSubmitting}>إرسال رابط إعادة التعيين</SubmitButton>

        <p className="text-center text-small">
          رجعتلك ذاكرتك؟{" "}
          <Link href="/login" className="font-semibold underline">
            سجّل دخول
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
