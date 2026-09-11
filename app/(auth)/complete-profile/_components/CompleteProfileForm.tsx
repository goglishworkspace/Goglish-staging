"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { GraduationCap, Users, ArrowRight } from "lucide-react";
import {
  completeProfileSchema,
  type CompleteProfileInput,
  type RoleType,
} from "@/lib/validation/auth.schemas";
import { postJson } from "@/lib/api/client-fetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthCard } from "../../_components/AuthCard";
import { Field, SubmitButton } from "../../_components/Field";

const GRADE_OPTIONS: Array<{ value: "grade1" | "grade2" | "grade3"; label: string }> = [
  { value: "grade1", label: "أولى ثانوي" },
  { value: "grade2", label: "ثانية ثانوي" },
  { value: "grade3", label: "ثالثة ثانوي" },
];

function RoleOptionCard({
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
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all duration-200 cursor-pointer",
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

export function CompleteProfileForm({
  initialFirstName = "",
  initialLastName = "",
  initialPhone = "",
}: {
  initialFirstName?: string;
  initialLastName?: string;
  initialPhone?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<RoleType>("student");

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      role_type: "student",
      first_name: initialFirstName,
      last_name: initialLastName,
      phone: initialPhone,
      parent_phone: "",
      grade: "grade1",
      child_phone: "",
    },
  });

  const currentRole = useWatch({ control, name: "role_type" });
  const selectedGrade = useWatch({ control, name: "grade" });

  const onSelectRole = (role: RoleType) => {
    setSelectedRole(role);
    setValue("role_type", role, { shouldValidate: true });
  };

  const onContinueStep = () => {
    setStep(2);
  };

  const onSubmit = async (values: CompleteProfileInput) => {
    const result = await postJson<{ destination: string }>("/api/auth/complete-profile", values);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("تم تسجيل بياناتك بنجاح! مرحباً بك في Goglish 🎉");
    router.push(result.data.destination || "/student/dashboard");
  };

  return (
    <AuthCard
      title="إكمال بيانات الحساب"
      headline="خطوة واحدة تفصلك عن البداية 🎓"
      subtext="لتخصيص تجربتك وتفعيل حسابك بالكامل على المنصة."
    >
      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <p className="text-center font-medium text-foreground">اختر نوع الحساب:</p>
          <div className="flex gap-3">
            <RoleOptionCard
              selected={selectedRole === "student"}
              onSelect={() => onSelectRole("student")}
              icon={<GraduationCap className="mx-auto size-8" />}
              title="أنا طالب"
              subtitle="في مرحلة الثانوية العامة"
            />
            <RoleOptionCard
              selected={selectedRole === "parent"}
              onSelect={() => onSelectRole("parent")}
              icon={<Users className="mx-auto size-8" />}
              title="أنا ولي أمر"
              subtitle="لمتابعة مستوى الأبناء"
            />
          </div>

          <Button type="button" onClick={onContinueStep} className="w-full py-5 font-semibold text-base">
            متابعة
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-small font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              <ArrowRight className="size-4" />
              تغيير النوع ({currentRole === "student" ? "طالب" : "ولي أمر"})
            </button>
            <span className="text-caption text-muted-foreground">خطوة 2 من 2</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم الأول" htmlFor="first_name" error={errors.first_name?.message}>
              <Input
                id="first_name"
                placeholder="أحمد"
                aria-invalid={!!errors.first_name}
                {...register("first_name")}
              />
            </Field>

            <Field label="اسم العائلة" htmlFor="last_name" error={errors.last_name?.message}>
              <Input
                id="last_name"
                placeholder="محمود"
                aria-invalid={!!errors.last_name}
                {...register("last_name")}
              />
            </Field>
          </div>

          <Field
            label={currentRole === "student" ? "رقم هاتف الطالب / الواتساب" : "رقم الهاتف / الواتساب"}
            htmlFor="phone"
            error={errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              placeholder="01012345678"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            <p className="text-caption text-muted-foreground">رقم هاتف مصري من 11 رقم (مثال: 01012345678)</p>
          </Field>

          {currentRole === "student" && (
            <Field
              label="رقم هاتف ولي الأمر (إلزامي)"
              htmlFor="parent_phone"
              error={errors.parent_phone?.message}
            >
              <Input
                id="parent_phone"
                type="tel"
                dir="ltr"
                placeholder="01012345678"
                aria-invalid={!!errors.parent_phone}
                {...register("parent_phone")}
              />
              <p className="text-caption text-muted-foreground">رقم هاتف مصري من 11 رقم لولي الأمر</p>
            </Field>
          )}

          {currentRole === "student" ? (
            <Field label="الصف الدراسي" htmlFor="grade" error={errors.grade?.message}>
              <div className="grid grid-cols-3 gap-2">
                {GRADE_OPTIONS.map((g) => {
                  const isChecked = selectedGrade === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setValue("grade", g.value, { shouldValidate: true })}
                      aria-pressed={isChecked}
                      className={cn(
                        "rounded-lg border p-3 text-center text-small font-medium transition-colors cursor-pointer",
                        isChecked
                          ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                          : "border-border text-foreground hover:bg-muted",
                      )}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : (
            <Field
              label="رقم هاتف الطالب (اختياري)"
              htmlFor="child_phone"
              error={errors.child_phone?.message}
            >
              <Input
                id="child_phone"
                type="tel"
                dir="ltr"
                placeholder="01012345678"
                aria-invalid={!!errors.child_phone}
                {...register("child_phone")}
              />
              <p className="text-caption text-muted-foreground">إذا كان ابنك مسجلاً بالمنصة، يمكنك وضع رقمه لربط حسابه تلقائياً</p>
            </Field>
          )}

          <SubmitButton disabled={isSubmitting}>
            تأكيد وبدء الاستخدام
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
