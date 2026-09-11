"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/lib/api/queries/profile";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export function ChangePasswordSection({
  onSuccess,
  onCancel,
  inDialog = false,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  inDialog?: boolean;
} = {}) {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("كلمة المرور الحالية مطلوبة");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية");
      return;
    }

    changePassword.mutate(
      {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      },
      {
        onSuccess: () => {
          toast.success("تم تغيير كلمة المرور بنجاح");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          onSuccess?.();
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, "تعذر تغيير كلمة المرور"));
        },
      },
    );
  };

  const formContent = (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">كلمة المرور الحالية</Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            dir="ltr"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="pe-10"
          />
          <button
            type="button"
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            tabIndex={-1}
            aria-label={showCurrentPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="pe-10"
            />
            <button
              type="button"
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
              aria-label={showNewPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="pe-10"
            />
            <button
              type="button"
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              aria-label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            إلغاء
          </Button>
        )}
        <Button
          type="submit"
          className="w-fit"
          disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
        >
          {changePassword.isPending ? "جاري التغيير..." : "تحديث كلمة المرور"}
        </Button>
      </div>
    </form>
  );

  if (inDialog) {
    return formContent;
  }

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
            <Lock className="size-5 text-primary" />
            الأمان وكلمة المرور
          </h2>
          <p className="mt-1 text-caption text-muted-foreground">
            قم بتحديث كلمة المرور الخاصة بحسابك. يجب أن تتكون من 8 أحرف على الأقل.
          </p>
        </div>

        {formContent}
      </CardContent>
    </Card>
  );
}
