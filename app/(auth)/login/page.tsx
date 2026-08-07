"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validation/auth.schemas";
import { postJson } from "@/lib/api/client-fetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AuthCard } from "../_components/AuthCard";
import { Field, SubmitButton } from "../_components/Field";

type LoginResult =
  | { status: "ok"; user_id: string }
  | { status: "device_limit_confirm"; oldest_device: { user_agent: string | null; last_active_at: string } };

export default function LoginPage() {
  const router = useRouter();
  const [pendingValues, setPendingValues] = useState<LoginInput | null>(null);
  const [oldestDevice, setOldestDevice] = useState<{ user_agent: string | null; last_active_at: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const attemptLogin = async (values: LoginInput, confirmKick: boolean) => {
    const result = await postJson<LoginResult>("/api/auth/login", { ...values, confirm_kick: confirmKick });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    if (result.data.status === "device_limit_confirm") {
      setPendingValues(values);
      setOldestDevice(result.data.oldest_device);
      return;
    }
    router.push("/");
  };

  const onSubmit = (values: LoginInput) => attemptLogin(values, false);

  const onConfirmKick = async () => {
    if (!pendingValues) return;
    setConfirming(true);
    await attemptLogin(pendingValues, true);
    setConfirming(false);
    setOldestDevice(null);
    setPendingValues(null);
  };

  return (
    <AuthCard title="تسجيل الدخول">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="الإيميل" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>

        <Field label="الباسورد" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>

        <SubmitButton disabled={isSubmitting}>دخول</SubmitButton>

        <div className="flex items-center justify-between text-small">
          <Link href="/forgot-password" className="underline">
            نسيت الباسورد؟
          </Link>
          <Link href="/register" className="font-semibold underline">
            إنشاء حساب
          </Link>
        </div>
      </form>

      <Dialog open={!!oldestDevice} onOpenChange={(open) => !open && setOldestDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>وصلت للحد الأقصى من الأجهزة (جهازين)</DialogTitle>
            <DialogDescription>
              لو كملت تسجيل الدخول من الجهاز ده، هيتم تسجيل خروجك تلقائي من أقدم جهاز نشط
              {oldestDevice?.user_agent ? ` (${oldestDevice.user_agent})` : ""}. تحب تكمل؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOldestDevice(null)} disabled={confirming}>
              إلغاء
            </Button>
            <Button onClick={onConfirmKick} disabled={confirming}>
              {confirming ? "جاري تسجيل الدخول..." : "كمّل وسجّل خروج الجهاز القديم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthCard>
  );
}
