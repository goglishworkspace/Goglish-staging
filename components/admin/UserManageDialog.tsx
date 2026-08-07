"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useBanUser,
  useUnbanUser,
  useResetUserPassword,
  useResetUserDevices,
  useAssignRole,
  useRevokeRole,
  useSuspendTeacher,
  useReactivateTeacher,
  useSoftDeleteUser,
  type AdminUserSummary,
} from "@/lib/api/queries/admin-users";

const ASSIGNABLE_ROLES = [
  "student",
  "parent",
  "teacher",
  "moderator",
  "support",
  "content_manager",
  "accountant",
  "admin",
  "super_admin",
];

const PRIVILEGED_ROLES = ["admin", "super_admin"];

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function toastHandlers(successMessage: string) {
  return {
    onSuccess: () => toast.success(successMessage),
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "تعذر تنفيذ الإجراء")),
  };
}

export function UserManageDialog({
  user,
  open,
  onOpenChange,
  viewerIsSuperAdmin,
}: {
  user: AdminUserSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerIsSuperAdmin: boolean;
}) {
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const resetPassword = useResetUserPassword();
  const resetDevices = useResetUserDevices();
  const assignRole = useAssignRole();
  const revokeRole = useRevokeRole();
  const suspendTeacher = useSuspendTeacher();
  const reactivateTeacher = useReactivateTeacher();
  const softDelete = useSoftDeleteUser();
  const [roleToAssign, setRoleToAssign] = useState("");
  const [teacherDisplayName, setTeacherDisplayName] = useState("");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherExperienceYears, setTeacherExperienceYears] = useState("");
  const assignableRoles = viewerIsSuperAdmin
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter((r) => !PRIVILEGED_ROLES.includes(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription>
            {user.email}
            {user.phone && (
              <>
                {" - "}
                <span dir="ltr">{user.phone}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {user.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
          {user.banned && <Badge variant="destructive">محظور</Badge>}
          {user.deleted_at && <Badge variant="destructive">محذوف</Badge>}
          {user.comment_banned && <Badge variant="destructive">ممنوع من التعليق</Badge>}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {user.banned ? (
              <Button
                size="sm"
                variant="outline"
                disabled={unbanUser.isPending}
                onClick={() => unbanUser.mutate({ id: user.id, input: undefined }, toastHandlers("تم فك الحظر"))}
              >
                فك الحظر
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                disabled={banUser.isPending}
                onClick={() => banUser.mutate({ id: user.id, input: undefined }, toastHandlers("تم حظر المستخدم"))}
              >
                حظر المستخدم
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={resetPassword.isPending}
              onClick={() => resetPassword.mutate({ id: user.id, input: undefined }, toastHandlers("تم إرسال رابط إعادة تعيين الباسورد"))}
            >
              إعادة تعيين الباسورد
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={resetDevices.isPending}
              onClick={() => resetDevices.mutate({ id: user.id, input: undefined }, toastHandlers("تم إعادة ضبط الأجهزة"))}
            >
              إعادة ضبط الأجهزة
            </Button>
          </div>

          {user.is_teacher && (
            <div className="flex flex-wrap gap-2">
              {user.teacher_status === "suspended" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reactivateTeacher.isPending}
                  onClick={() => reactivateTeacher.mutate({ id: user.id, input: undefined }, toastHandlers("تم تفعيل حساب المدرس"))}
                >
                  تفعيل حساب المدرس
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={suspendTeacher.isPending}
                  onClick={() => suspendTeacher.mutate({ id: user.id, input: undefined }, toastHandlers("تم إيقاف حساب المدرس"))}
                >
                  إيقاف حساب المدرس
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-small font-medium text-foreground">تعيين دور</p>
            <p className="text-caption text-muted-foreground">
              تعيين دور جديد بيلغي كل أدوار المستخدم الحالية وبيديله الدور ده بس.
            </p>
            {!viewerIsSuperAdmin && (
              <p className="text-caption text-muted-foreground">
                بس السوبر أدمن يقدر يعيّن أو يلغي دور الأدمن.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleToAssign}
                onChange={(e) => setRoleToAssign(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">اختر دور</option>
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={
                  !roleToAssign ||
                  assignRole.isPending ||
                  (roleToAssign === "teacher" && !teacherDisplayName.trim())
                }
                onClick={() => {
                  const experience = teacherExperienceYears.trim() ? Number(teacherExperienceYears) : undefined;
                  assignRole.mutate(
                    {
                      id: user.id,
                      input: {
                        role_name: roleToAssign,
                        ...(roleToAssign === "teacher"
                          ? {
                              teacher_display_name: teacherDisplayName.trim(),
                              ...(teacherBio.trim() ? { teacher_bio: teacherBio.trim() } : {}),
                              ...(experience !== undefined && !Number.isNaN(experience)
                                ? { teacher_experience_years: experience }
                                : {}),
                            }
                          : {}),
                      },
                    },
                    toastHandlers("تم تعيين الدور"),
                  );
                }}
              >
                تعيين
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!roleToAssign || revokeRole.isPending}
                onClick={() => revokeRole.mutate({ id: user.id, input: { role_name: roleToAssign } }, toastHandlers("تم إلغاء الدور"))}
              >
                إلغاء
              </Button>
            </div>

            {roleToAssign === "teacher" && (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-caption text-muted-foreground">
                  البيانات دي هتظهر للطلاب في الصفحة الرئيسية وصفحة المدرس العامة.
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assign-teacher-name">اسم العرض</Label>
                  <Input
                    id="assign-teacher-name"
                    value={teacherDisplayName}
                    onChange={(e) => setTeacherDisplayName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assign-teacher-bio">نبذة (اختياري)</Label>
                  <Textarea
                    id="assign-teacher-bio"
                    value={teacherBio}
                    onChange={(e) => setTeacherBio(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assign-teacher-experience">سنين الخبرة (اختياري)</Label>
                  <Input
                    id="assign-teacher-experience"
                    type="number"
                    min={0}
                    value={teacherExperienceYears}
                    onChange={(e) => setTeacherExperienceYears(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {!user.deleted_at && (
            <Button
              variant="destructive"
              disabled={softDelete.isPending}
              onClick={() => softDelete.mutate({ id: user.id, input: undefined }, toastHandlers("تم حذف المستخدم (يمكن استرجاعه خلال 30 يوم)"))}
            >
              حذف المستخدم
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
