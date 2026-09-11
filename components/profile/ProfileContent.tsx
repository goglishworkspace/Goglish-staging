"use client";

import { useState } from "react";
import { UserCog, Lock, KeyRound } from "lucide-react";
import { useProfile } from "@/lib/api/queries/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { StudentStatsCard } from "@/components/dashboard/StudentStatsCard";
import { PersonalInfoSection } from "@/components/dashboard/PersonalInfoSection";
import { ChangePasswordSection } from "@/components/dashboard/ChangePasswordSection";
import { GradeChangeSection } from "@/components/dashboard/GradeChangeSection";
import { DevicesSection } from "@/components/dashboard/DevicesSection";
import { NotificationSettingsSection } from "@/components/dashboard/NotificationSettingsSection";
import { TeacherProfileSection } from "@/components/dashboard/TeacherProfileSection";

export function ProfileContent({
  showGrade = false,
  showTeacherProfile = false,
}: {
  showGrade?: boolean;
  showTeacherProfile?: boolean;
}) {
  const { data: profile, isLoading } = useProfile();
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const initials = profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}` : "";

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
          {showGrade && <StudentStatsCard profile={profile} />}

          {/* User Overview Card */}
          <Card className="w-full">
            <CardContent className="flex w-full flex-col gap-6 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div className="flex items-center gap-4">
                  <AvatarImage src={profile.avatar_url} initials={initials} alt="الصورة الشخصية" size={72} />
                  <div>
                    <h2 className="text-h3 font-bold text-foreground">
                      {profile.first_name} {profile.last_name}
                    </h2>
                    <p className="text-caption text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-fit self-start sm:self-center"
                  onClick={() => setIsEditingInfo(true)}
                >
                  <UserCog className="size-4" />
                  <span>تعديل البيانات الشخصية</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <p className="text-caption text-muted-foreground">الاسم بالكامل</p>
                  <p className="font-semibold text-foreground text-small mt-0.5">
                    {profile.first_name} {profile.last_name}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <p className="text-caption text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-semibold text-foreground text-small mt-0.5 truncate">{profile.email}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <p className="text-caption text-muted-foreground">رقم التليفون الشخصي</p>
                  <p dir="ltr" className="font-semibold text-foreground text-small mt-0.5 text-start">
                    {profile.phone || "غير مسجل"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <p className="text-caption text-muted-foreground">رقم تليفون ولي الأمر</p>
                  <p dir="ltr" className="font-semibold text-foreground text-small mt-0.5 text-start">
                    {profile.parent_phone || "غير مسجل"}
                  </p>
                </div>
                {profile.national_id && (
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                    <p className="text-caption text-muted-foreground">الرقم القومي</p>
                    <p dir="ltr" className="font-semibold text-foreground text-small mt-0.5 text-start">
                      {profile.national_id}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Modal (Only opens when requested) */}
          <Dialog open={isEditingInfo} onOpenChange={setIsEditingInfo}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تعديل البيانات الشخصية</DialogTitle>
                <DialogDescription>
                  يمكنك تعديل اسمك ورقم هاتفك ورقم ولي أمرك.
                </DialogDescription>
              </DialogHeader>
              <PersonalInfoSection
                profile={profile}
                inDialog
                showParentPhone={showGrade}
                onSuccess={() => setIsEditingInfo(false)}
                onCancel={() => setIsEditingInfo(false)}
              />
            </DialogContent>
          </Dialog>

          {showGrade && <GradeChangeSection profile={profile} />}
          {showTeacherProfile && <TeacherProfileSection />}

          {/* Password & Security Card */}
          <Card className="w-full">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="text-h3 font-bold text-foreground">الأمان وكلمة المرور</h2>
                  <p className="text-caption text-muted-foreground">
                    يمكنك تغيير كلمة المرور لحسابك في أي وقت لتعزيز أمان حسابك.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 w-fit self-start sm:self-center"
                onClick={() => setIsChangingPassword(true)}
              >
                <KeyRound className="size-4" />
                <span>تغيير كلمة المرور</span>
              </Button>
            </CardContent>
          </Card>

          {/* Change Password Modal (Only opens when requested) */}
          <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تغيير كلمة المرور</DialogTitle>
                <DialogDescription>
                  قم بتحديث كلمة المرور الخاصة بحسابك. يجب أن تتكون من 8 أحرف على الأقل.
                </DialogDescription>
              </DialogHeader>
              <ChangePasswordSection
                inDialog
                onSuccess={() => setIsChangingPassword(false)}
                onCancel={() => setIsChangingPassword(false)}
              />
            </DialogContent>
          </Dialog>

          <DevicesSection />
          <NotificationSettingsSection />
        </>
      )}
    </div>
  );
}
