"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
      toast.success("تم تغيير الصف الدراسي");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setPendingGrade(null);
    } catch {
      toast.error("تعذر تغيير الصف الدراسي");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h2 className="text-h3 text-secondary dark:text-white">الصف الدراسي</h2>
        <p className="mt-1 text-small text-muted-foreground">
          الصف الحالي: {profile.grade ? GRADE_LABELS[profile.grade] : "لسه ما اخترتش"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(GRADE_LABELS).map(([value, label]) => (
            <Dialog key={value} open={pendingGrade === value} onOpenChange={(open) => !open && setPendingGrade(null)}>
              <DialogTrigger
                render={
                  <Button
                    variant={profile.grade === value ? "default" : "outline"}
                    disabled={profile.grade === value}
                    onClick={() => setPendingGrade(value)}
                  />
                }
              >
                {label}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تأكيد تغيير الصف الدراسي</DialogTitle>
                  <DialogDescription>
                    جميع الاقتراحات والكورسات ستتغير بناءً على الصف الجديد. متأكد إنك عايز تغيّر لـ
                    &quot;{label}&quot;؟
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>إلغاء</DialogClose>
                  <Button disabled={saving} onClick={onConfirm}>
                    تأكيد التغيير
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
