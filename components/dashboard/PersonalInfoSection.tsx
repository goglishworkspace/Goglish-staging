"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useUpdatePersonalInfo, type Profile } from "@/lib/api/queries/profile";

const COOLDOWN_DAYS = 7;
const EGYPTIAN_PHONE_REGEX = /^(\+20|0)?1[0125]\d{8}$/;

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function daysUntilNextChange(personalInfoUpdatedAt: string | null): number {
  if (!personalInfoUpdatedAt) return 0;
  const elapsedDays = (Date.now() - new Date(personalInfoUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(COOLDOWN_DAYS - elapsedDays));
}

export function PersonalInfoSection({
  profile,
  onSuccess,
  onCancel,
  inDialog = false,
  showParentPhone = true,
}: {
  profile: Profile;
  onSuccess?: () => void;
  onCancel?: () => void;
  inDialog?: boolean;
  showParentPhone?: boolean;
}) {
  const updateInfo = useUpdatePersonalInfo();
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [parentPhone, setParentPhone] = useState(profile.parent_phone ?? "");

  const daysLeft = daysUntilNextChange(profile.personal_info_updated_at);
  const locked = daysLeft > 0;

  const onSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("الاسم الأول واسم العائلة مطلوبان");
      return;
    }

    const trimmedPhone = phone.trim();
    const trimmedParentPhone = parentPhone.trim();

    if (trimmedPhone && !EGYPTIAN_PHONE_REGEX.test(trimmedPhone)) {
      toast.error("يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)");
      return;
    }

    if (trimmedParentPhone && !EGYPTIAN_PHONE_REGEX.test(trimmedParentPhone)) {
      toast.error("يرجى إدخال رقم هاتف ولي أمر مصري صحيح (مثال: 01012345678)");
      return;
    }

    if (trimmedPhone && trimmedParentPhone && trimmedPhone === trimmedParentPhone) {
      toast.error("رقم هاتف ولي الأمر لا يمكن أن يكون مطابقاً لرقم هاتفك");
      return;
    }

    updateInfo.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: trimmedPhone || undefined,
        parent_phone: trimmedParentPhone || undefined,
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث بياناتك بنجاح");
          onSuccess?.();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث البيانات")),
      },
    );
  };

  const formContent = (
    <div className="flex w-full flex-col gap-4">
      {!inDialog && (
        <div>
          <h2 className="text-h3 text-secondary dark:text-white">تعديل الاسم والبيانات</h2>
          <p className="mt-1 text-caption text-muted-foreground">
            تقدر تغيّر اسمك ورقم تليفونك وبياناتك مرة واحدة كل 7 أيام. الإيميل لا يمكن تغييره.
          </p>
        </div>
      )}

      {locked && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-small text-amber-700 dark:text-amber-400">
          غيّرت بياناتك مؤخراً - تقدر تعدّل تاني بعد {daysLeft} يوم.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi-first-name">الاسم الأول</Label>
          <Input
            id="pi-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={locked}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi-last-name">اسم العائلة (الاسم الأخير)</Label>
          <Input
            id="pi-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={locked}
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showParentPhone ? "sm:grid-cols-2" : ""}`}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi-phone">رقم التليفون الشخصي</Label>
          <Input
            id="pi-phone"
            dir="ltr"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={locked}
          />
        </div>
        {showParentPhone && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pi-parent-phone">رقم تليفون ولي الأمر</Label>
            <Input
              id="pi-parent-phone"
              dir="ltr"
              placeholder="01012345678"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              disabled={locked}
            />
            <p className="text-caption text-muted-foreground">
              ضروري لربط حسابك بولي الأمر ومتابعة تقدمك الدراسي.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            إلغاء
          </Button>
        )}
        <Button className="w-fit" disabled={locked || updateInfo.isPending} onClick={onSave}>
          {updateInfo.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
        </Button>
      </div>
    </div>
  );

  if (inDialog) {
    return formContent;
  }

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-4 p-6">{formContent}</CardContent>
    </Card>
  );
}

