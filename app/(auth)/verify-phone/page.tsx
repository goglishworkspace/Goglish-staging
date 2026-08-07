"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  verifyPhoneRequestSchema,
  verifyPhoneConfirmSchema,
  type VerifyPhoneRequestInput,
  type VerifyPhoneConfirmInput,
} from "@/lib/validation/auth.schemas";
import { postJson } from "@/lib/api/client-fetch";
import { Input } from "@/components/ui/input";
import { AuthCard } from "../_components/AuthCard";
import { Field, FormMessage, SubmitButton } from "../_components/Field";

export default function VerifyPhonePage() {
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const requestForm = useForm<VerifyPhoneRequestInput>({
    resolver: zodResolver(verifyPhoneRequestSchema),
  });
  const confirmForm = useForm<VerifyPhoneConfirmInput>({
    resolver: zodResolver(verifyPhoneConfirmSchema),
  });

  const onRequest = async (values: VerifyPhoneRequestInput) => {
    const result = await postJson("/api/auth/verify-phone/request", values);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setStep("confirm");
  };

  const onConfirm = async (values: VerifyPhoneConfirmInput) => {
    const result = await postJson("/api/auth/verify-phone/confirm", values);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setDoneMessage(result.message);
    setStep("done");
  };

  return (
    <AuthCard title="تفعيل رقم التليفون">
      {step === "request" && (
        <form onSubmit={requestForm.handleSubmit(onRequest)} className="flex flex-col gap-4">
          <Field
            label="رقم التليفون"
            htmlFor="phone"
            error={requestForm.formState.errors.phone?.message}
          >
            <Input
              id="phone"
              aria-invalid={!!requestForm.formState.errors.phone}
              {...requestForm.register("phone")}
            />
          </Field>
          <SubmitButton disabled={requestForm.formState.isSubmitting}>
            إرسال كود التحقق
          </SubmitButton>
        </form>
      )}

      {step === "confirm" && (
        <form onSubmit={confirmForm.handleSubmit(onConfirm)} className="flex flex-col gap-4">
          <Field
            label="كود التحقق (6 أرقام)"
            htmlFor="code"
            error={confirmForm.formState.errors.code?.message}
          >
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              aria-invalid={!!confirmForm.formState.errors.code}
              {...confirmForm.register("code")}
            />
          </Field>
          <SubmitButton disabled={confirmForm.formState.isSubmitting}>تأكيد الكود</SubmitButton>
        </form>
      )}

      {step === "done" && doneMessage && <FormMessage kind="success" text={doneMessage} />}
    </AuthCard>
  );
}
