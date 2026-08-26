"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useUpdatePersonalInfo, type Profile } from "@/lib/api/queries/profile";

const COOLDOWN_DAYS = 30;

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function daysUntilNextChange(personalInfoUpdatedAt: string | null): number {
  if (!personalInfoUpdatedAt) return 0;
  const elapsedDays = (Date.now() - new Date(personalInfoUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(COOLDOWN_DAYS - elapsedDays));
}

export function PersonalInfoSection({ profile }: { profile: Profile }) {
  const updateInfo = useUpdatePersonalInfo();
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phone, setPhone] = useState(profile.phone ?? "");

  const daysLeft = daysUntilNextChange(profile.personal_info_updated_at);
  const locked = daysLeft > 0;

  const onSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    updateInfo.mutate(
      { first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || undefined },
      {
        onSuccess: () => toast.success("تم تحديث بياناتك"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث البيانات")),
      },
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-4 p-6">
        <div>
          <h2 className="text-h3 text-secondary dark:text-white">تعديل الاسم والبيانات</h2>
          <p className="mt-1 text-caption text-muted-foreground">
            تقدر تغيّر اسمك ورقم تليفونك مرة واحدة كل 30 يوم بس. الإيميل مينفعش يتغير خالص.
          </p>
        </div>

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
            <Label htmlFor="pi-last-name">الاسم الأخير</Label>
            <Input
              id="pi-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={locked}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi-phone">رقم التليفون</Label>
          <Input id="pi-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={locked} />
        </div>

        <Button className="w-fit" disabled={locked || updateInfo.isPending} onClick={onSave}>
          حفظ التعديلات
        </Button>
      </CardContent>
    </Card>
  );
}
