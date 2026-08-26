"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyTeacher, useUpdateMyTeacherProfile, normalizeTeacherProfile } from "@/lib/api/queries/teacher";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export function TeacherProfileSection() {
  const { data: teacher, isLoading } = useMyTeacher();
  const updateProfile = useUpdateMyTeacherProfile();
  const profile = teacher ? normalizeTeacherProfile(teacher) : null;

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [experienceYears, setExperienceYears] = useState(String(profile?.experience_years ?? ""));
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url ?? "");
  const [initialized, setInitialized] = useState(false);

  // Seed the form once the real profile data arrives (useMyTeacher() resolves
  // after this component's first render) - only once, so it doesn't stomp on
  // whatever the teacher is actively typing on a later refetch.
  if (!initialized && profile) {
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setExperienceYears(profile.experience_years != null ? String(profile.experience_years) : "");
    setPhotoUrl(profile.photo_url ?? "");
    setInitialized(true);
  }

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (!teacher) return null;

  const onSave = () => {
    if (!displayName.trim()) {
      toast.error("اسم العرض مطلوب");
      return;
    }
    const experience = experienceYears.trim() ? Number(experienceYears) : undefined;
    if (experience !== undefined && (Number.isNaN(experience) || experience < 0)) {
      toast.error("عدد سنين الخبرة غير صالح");
      return;
    }
    updateProfile.mutate(
      {
        display_name: displayName.trim(),
        bio: bio.trim(),
        ...(photoUrl.trim() ? { photo_url: photoUrl.trim() } : {}),
        ...(experience !== undefined ? { experience_years: experience } : {}),
      },
      {
        onSuccess: () => toast.success("تم تحديث ملفك كمدرس"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الملف")),
      },
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-4 p-6">
        <div>
          <h2 className="text-h3 text-secondary dark:text-white">ملفي كمدرس</h2>
          <p className="mt-1 text-caption text-muted-foreground">
            الاسم والوصف وسنين الخبرة دي بتظهر للطلاب في صفحتك العامة وصفحات كورساتك.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tp-display-name">اسم العرض</Label>
          <Input id="tp-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tp-bio">الوصف</Label>
          <Textarea id="tp-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tp-experience">سنين الخبرة</Label>
          <Input
            id="tp-experience"
            type="number"
            min={0}
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tp-photo">رابط الصورة الشخصية (اختياري)</Label>
          <Input
            id="tp-photo"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <Button className="w-fit" disabled={updateProfile.isPending} onClick={onSave}>
          حفظ التعديلات
        </Button>
      </CardContent>
    </Card>
  );
}
