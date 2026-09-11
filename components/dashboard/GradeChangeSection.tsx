"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/axios";
import type { Profile } from "@/lib/api/queries/profile";

const GRADE_LABELS: Record<string, string> = {
  grade1: "أولى ثانوي",
  grade2: "ثانية ثانوي",
  grade3: "ثالثة ثانوي",
};

export function GradeChangeSection({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [pendingGrade, setPendingGrade] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onConfirm = async () => {
    if (!pendingGrade) return;
    setSaving(true);
    try {
      await api.patch("/api/profile/grade", { grade: pendingGrade });
      toast.success("تم تغيير الصف الدراسي بنجاح");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setPendingGrade(null);
    } catch {
      toast.error("تعذر تغيير الصف الدراسي، يرجى المحاولة لاحقاً");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div>
          <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
            <GraduationCap className="size-5 text-primary" />
            الصف الدراسي
          </h2>
          <p className="mt-1 text-small text-muted-foreground">
            الصف الحالي:{" "}
            <span className="font-semibold text-foreground">
              {profile.grade ? GRADE_LABELS[profile.grade] : "لم يتم التحديد"}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {Object.entries(GRADE_LABELS).map(([value, label]) => {
            const isSelected = profile.grade === value;
            return (
              <Button
                key={value}
                variant={isSelected ? "default" : "outline"}
                disabled={isSelected}
                onClick={() => setPendingGrade(value)}
                className="gap-1.5"
              >
                {isSelected && <Check className="size-4" />}
                {label}
              </Button>
            );
          })}
        </div>

        {/* Single controlled confirmation dialog */}
        <Dialog open={!!pendingGrade} onOpenChange={(open) => !open && setPendingGrade(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد تغيير الصف الدراسي</DialogTitle>
              <DialogDescription>
                جميع الاقتراحات والمناهج والكورسات ستتغير لتناسب الصف الجديد. هل أنت متأكد من رغبتك في الانتقال إلى{" "}
                <span className="font-semibold text-foreground">
                  &quot;{pendingGrade ? GRADE_LABELS[pendingGrade] : ""}&quot;
                </span>
                ؟
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose render={<Button variant="outline" />}>إلغاء</DialogClose>
              <Button disabled={saving} onClick={onConfirm}>
                {saving ? "جاري التغيير..." : "تأكيد التغيير"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

