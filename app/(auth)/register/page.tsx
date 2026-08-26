"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { GraduationCap, Users, ArrowRight } from "lucide-react";
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
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all duration-200",
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted",
      )}
    >
      <span className="text-h2 text-primary">{icon}</span>
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
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SelfRegisterInput>({
    resolver: zodResolver(selfRegisterSchema),
    defaultValues: {
      phone: "",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
    },
  });

  const selectedGrade = useWatch({ control, name: "grade" });

  const onSelectRole = (role: RoleType) => {
    setRoleType(role);
    setValue("role_type", role, { shouldValidate: true });
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
          child_phone: values.role_type === "parent" ? values.child_phone : undefined,
          phone: values.phone || undefined,
        },
      },
    });

    if (error && error.code !== "user_already_exists") {
      toast.error(error.message);
      return;
    }

    if (error?.code === "user_already_exists" || data.user?.identities?.length === 0) {
      toast.error("الإيميل ده مسجّل بحساب بالفعل - سجّل دخول أو استخدم نسيت الباسورد");
      return;
    }

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
        child_phone: values.role_type === "parent" ? values.child_phone : undefined,
      }).catch(() => {});
    }

    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  };

  return (
    <AuthCard
      title="إنشاء حساب جديد"
      headline="افتح أول صفحة في دفترك 🎓"
      subtext="سجّل دلوقتي في ثوانٍ وابدأ المذاكرة فوراً على Goglish."
    >
      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <p className="text-center font-medium text-foreground">اختر نوع الحساب:</p>
          <div className="flex gap-3">
            <RoleCard
              selected={roleType === "student"}
              onSelect={() => onSelectRole("student")}
              icon={<GraduationCap className="mx-auto size-8" />}
              title="أنا طالب"
              subtitle="في مرحلة الثانوية"
            />
            <RoleCard
              selected={roleType === "parent"}
              onSelect={() => onSelectRole("parent")}
              icon={<Users className="mx-auto size-8" />}
              title="أنا ولي أمر"
              subtitle="وعايز أتابع مستوى ابني"
            />
          </div>
          <p className="mt-2 text-center text-small">
            عندك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold text-primary underline">
              سجّل دخول
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-small font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight className="size-4" />
              تغيير ({roleType === "student" ? "طالب" : "ولي أمر"})
            </button>
            <span className="text-caption text-muted-foreground">خطوة 2 من 2</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الاسم الأول" htmlFor="first_name" error={errors.first_name?.message}>
              <Input id="first_name" placeholder="أحمد" aria-invalid={!!errors.first_name} {...register("first_name")} />
            </Field>
            <Field label="اسم العائلة" htmlFor="last_name" error={errors.last_name?.message}>
              <Input id="last_name" placeholder="علي" aria-invalid={!!errors.last_name} {...register("last_name")} />
            </Field>
          </div>

          <Field label="رقم الهاتف / الواتساب" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              placeholder="01012345678"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </Field>

          <Field label="البريد الإلكتروني" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              dir="ltr"
              placeholder="student@example.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Field label="كلمة المرور" htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </Field>

          {roleType === "student" && (
            <Field label="الصف الدراسي" htmlFor="grade" error={errors.grade?.message}>
              <div className="grid grid-cols-3 gap-2">
                {GRADE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedGrade === option.value ? "default" : "outline"}
                    className={cn(
                      "w-full text-sm",
                      selectedGrade === option.value && "font-bold shadow-sm",
                    )}
                    onClick={() => setValue("grade", option.value, { shouldValidate: true })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          {roleType === "parent" && (
            <Field
              label="رقم هاتف الطالب (اختياري)"
              htmlFor="child_phone"
              error={errors.child_phone?.message}
            >
              <Input
                id="child_phone"
                type="tel"
                dir="ltr"
                placeholder="01xxxxxxxxx"
                aria-invalid={!!errors.child_phone}
                {...register("child_phone")}
              />
              <p className="text-caption text-muted-foreground">
                يمكنك تركه فارغاً وربط حساب ابنك لاحقاً من لوحة تحكم ولي الأمر
              </p>
            </Field>
          )}

          <SubmitButton disabled={isSubmitting}>إنشاء الحساب والبدء 🚀</SubmitButton>

          <p className="text-center text-small">
            عندك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold text-primary underline">
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
