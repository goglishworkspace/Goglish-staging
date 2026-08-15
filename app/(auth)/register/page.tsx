"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { GraduationCap, Users } from "lucide-react";
import { selfRegisterSchema, type SelfRegisterInput, type RoleType } from "@/lib/validation/auth.schemas";
import { nationalIdErrorMessage } from "@/lib/national-id";
import { createClient } from "@/lib/supabase/client";
import { postJson } from "@/lib/api/client-fetch";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthCard } from "../_components/AuthCard";
import { Field, SubmitButton } from "../_components/Field";

const GRADE_OPTIONS: Array<{ value: "grade1" | "grade2" | "grade3"; label: string }> = [
  { value: "grade1", label: "أولى ثانوي" },
  { value: "grade2", label: "ثانية ثانوي" },
  { value: "grade3", label: "ثالثة ثانوي" },
];

function RoleCard({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-colors",
        selected
          ? "border-[#F5C518] bg-[#F5C518]/10"
          : "border-border hover:bg-muted",
      )}
    >
      <span className="text-h2">{icon}</span>
      <span className="font-semibold text-foreground">{title}</span>
      <span className="text-small text-muted-foreground">{subtitle}</span>
    </button>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [roleType, setRoleType] = useState<RoleType | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "invalid_format" || error === "underage" || error === "overage") {
      toast.error(`تعذر تفعيل الحساب: ${nationalIdErrorMessage(error)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SelfRegisterInput>({ resolver: zodResolver(selfRegisterSchema) });

  const selectedGrade = watch("grade");

  const onSelectRole = (role: RoleType) => {
    setRoleType(role);
    setValue("role_type", role);
  };

  const onContinue = () => {
    if (!roleType) {
      toast.error("اختر نوع الحساب الأول");
      return;
    }
    setStep(2);
  };

  const onSubmit = async (values: SelfRegisterInput) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          role_type: values.role_type,
          national_id: values.role_type === "student" ? values.national_id : undefined,
          grade: values.role_type === "student" ? values.grade : undefined,
          child_national_id: values.role_type === "parent" ? values.child_national_id : undefined,
          phone: values.phone || undefined,
        },
      },
    });

    if (error && error.code !== "user_already_exists") {
      toast.error(error.message);
      return;
    }

    // A confirmed existing account surfaces as either a real
    // "user_already_exists" error, or (with Supabase's enumeration
    // protection on) a "success" whose identities array is empty because no
    // new identity was actually created - either way, no new user, so tell
    // them plainly instead of sending them to "check your email" for an
    // email that was never sent. This deliberately trades the anti-enumeration
    // posture (an attacker could probe which emails are registered) for a
    // clearer signup experience - explicit product choice, not an oversight.
    if (error?.code === "user_already_exists" || data.user?.identities?.length === 0) {
      toast.error("الإيميل ده مسجّل بحساب بالفعل - سجّل دخول أو استخدم نسيت الباسورد");
      return;
    }

    // signUp() silently keeps the *first* attempt's metadata when this email
    // already has an unconfirmed identity (a retry after an earlier
    // abandoned/typo'd attempt) - force it to what was just typed so a retry
    // doesn't leave the profile with stale or missing phone/grade/etc. Best
    // effort: if this fails, registration still proceeds (complete_self_registration
    // will just read whatever metadata already exists, same as before this fix).
    if (data.user?.id) {
      await postJson("/api/auth/register/sync-metadata", {
        user_id: data.user.id,
        email: values.email,
        role_type: values.role_type,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
        national_id: values.role_type === "student" ? values.national_id : undefined,
        grade: values.role_type === "student" ? values.grade : undefined,
        child_national_id: values.role_type === "parent" ? values.child_national_id : undefined,
      }).catch(() => {});
    }

    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  };

  return (
    <AuthCard
      title="إنشاء حساب جديد"
      headline="افتح أول صفحة في دفترك"
      subtext="سجّل دلوقتي وابدأ ذاكر مع آلاف الطلاب على Goglish."
    >
      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <RoleCard
              selected={roleType === "student"}
              onSelect={() => onSelectRole("student")}
              icon={<GraduationCap className="mx-auto size-8" />}
              title="أنا طالب"
              subtitle="في الثانوية"
            />
            <RoleCard
              selected={roleType === "parent"}
              onSelect={() => onSelectRole("parent")}
              icon={<Users className="mx-auto size-8" />}
              title="أنا ولي أمر"
              subtitle="وعايز أتابع ابني"
            />
          </div>
          <Button className="w-full" disabled={!roleType} onClick={onContinue}>
            متابعة
          </Button>
          <p className="text-center text-small">
            عندك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold underline">
              سجّل دخول
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="self-start text-small text-muted-foreground underline"
          >
            &rarr; تغيير نوع الحساب
          </button>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الاسم الأول" htmlFor="first_name" error={errors.first_name?.message}>
              <Input id="first_name" aria-invalid={!!errors.first_name} {...register("first_name")} />
            </Field>
            <Field label="الاسم الأخير" htmlFor="last_name" error={errors.last_name?.message}>
              <Input id="last_name" aria-invalid={!!errors.last_name} {...register("last_name")} />
            </Field>
          </div>

          <Field label="الإيميل" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>

          <Field label="تأكيد الإيميل" htmlFor="confirm_email" error={errors.confirm_email?.message}>
            <Input
              id="confirm_email"
              type="email"
              aria-invalid={!!errors.confirm_email}
              onPaste={(e) => e.preventDefault()}
              {...register("confirm_email")}
            />
            <p className="text-caption text-muted-foreground">
              مينفعش تلزق هنا، اكتبه تاني يدوي عشان نتأكد إنك مكتبوش غلط
            </p>
          </Field>

          {roleType === "student" && (
            <Field label="الرقم القومي" htmlFor="national_id" error={errors.national_id?.message}>
              <Input
                id="national_id"
                inputMode="numeric"
                maxLength={14}
                aria-invalid={!!errors.national_id}
                {...register("national_id")}
              />
            </Field>
          )}

          {roleType === "parent" && (
            <Field
              label="الرقم القومي للطالب (اختياري)"
              htmlFor="child_national_id"
              error={errors.child_national_id?.message}
            >
              <Input
                id="child_national_id"
                inputMode="numeric"
                maxLength={14}
                aria-invalid={!!errors.child_national_id}
                {...register("child_national_id")}
              />
              <p className="text-caption text-muted-foreground">
                لو حطيته هيتم ربط حسابك بحساب ابنك تلقائياً، أو ممكن تسيبه فاضي وتربط الحساب بعدين من صفحة ولي الأمر
              </p>
            </Field>
          )}

          <Field label="رقم الهاتف" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" aria-invalid={!!errors.phone} {...register("phone")} />
          </Field>

          {roleType === "student" && (
            <Field label="الصف الدراسي" htmlFor="grade" error={errors.grade?.message}>
              <div className="flex flex-wrap gap-2">
                {GRADE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedGrade === option.value ? "default" : "outline"}
                    onClick={() => setValue("grade", option.value, { shouldValidate: true })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          <Field label="الباسورد" htmlFor="password" error={errors.password?.message}>
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

          <SubmitButton disabled={isSubmitting}>إنشاء حساب</SubmitButton>

          <p className="text-center text-small">
            عندك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold underline">
              سجّل دخول
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthCard title="إنشاء حساب جديد">{null}</AuthCard>}>
      <RegisterPageContent />
    </Suspense>
  );
}
