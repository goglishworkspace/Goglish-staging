"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { useProfile, useUploadAvatar, useDeleteAvatar, type Profile } from "@/lib/api/queries/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { PersonalInfoSection } from "@/components/dashboard/PersonalInfoSection";
import { GradeChangeSection } from "@/components/dashboard/GradeChangeSection";
import { DevicesSection } from "@/components/dashboard/DevicesSection";
import { NotificationSettingsSection } from "@/components/dashboard/NotificationSettingsSection";
import { TeacherProfileSection } from "@/components/dashboard/TeacherProfileSection";

const ALLOWED_TYPES = "image/jpeg,image/png,image/webp";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function AvatarSection({ profile }: { profile: Profile }) {
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success("تم رفع الصورة الشخصية"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر رفع الصورة")),
    });
  };

  const onRemove = () => {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => toast.success("تم حذف الصورة الشخصية"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الصورة")),
    });
  };

  return (
    <div className="flex items-center gap-4">
      <AvatarImage src={profile.avatar_url} initials={initials} alt="الصورة الشخصية" size={80} />
      <div className="flex flex-col gap-2">
        <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES} className="hidden" onChange={onFileChange} />
        <Button
          size="sm"
          variant="outline"
          disabled={uploadAvatar.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {profile.avatar_url ? "تغيير الصورة" : "إضافة صورة شخصية"}
        </Button>
        {profile.avatar_url && (
          <Button size="sm" variant="ghost" disabled={deleteAvatar.isPending} onClick={onRemove}>
            حذف الصورة
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProfileContent({
  showGrade = false,
  showTeacherProfile = false,
}: {
  showGrade?: boolean;
  showTeacherProfile?: boolean;
}) {
  const { data: profile, isLoading } = useProfile();

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">الملف الشخصي</h1>

      {isLoading && (
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && profile && (
        <>
          <Card className="w-full">
            <CardContent className="flex w-full flex-col gap-6 p-6">
              <AvatarSection profile={profile} />

              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p className="text-caption text-muted-foreground">الاسم</p>
                  <p className="font-medium">
                    {profile.first_name} {profile.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">الإيميل</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                {profile.phone && (
                  <div>
                    <p className="text-caption text-muted-foreground">رقم التليفون</p>
                    <p dir="ltr" className="text-end font-medium">{profile.phone}</p>
                  </div>
                )}
                {profile.national_id && (
                  <div>
                    <p className="text-caption text-muted-foreground">الرقم القومي</p>
                    <p dir="ltr" className="text-end font-medium">{profile.national_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showGrade && <PersonalInfoSection profile={profile} />}
          {showGrade && <GradeChangeSection profile={profile} />}
          {showTeacherProfile && <TeacherProfileSection />}
          <DevicesSection />
          <NotificationSettingsSection />
        </>
      )}
    </div>
  );
}
