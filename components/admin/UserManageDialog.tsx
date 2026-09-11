"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User,
  Smartphone,
  BookOpen,
  FileText,
  KeyRound,
  Ban,
  Trash2,
  RotateCcw,
  Plus,
  Laptop,
  GraduationCap,
  Award,
  TrendingUp,
  Trophy,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useAdminUserDetail,
  useAdminUpdateUserProfile,
  useAdminKickDevice,
  useAdminGrantCourseAccess,
  useBanUser,
  useUnbanUser,
  useResetUserPassword,
  useResetUserDevices,
  useAssignRole,
  useRevokeRole,
  useSuspendTeacher,
  useReactivateTeacher,
  useSoftDeleteUser,
  useRestoreUser,
  type AdminUserSummary,
} from "@/lib/api/queries/admin-users";
import { useCourses } from "@/lib/api/queries/courses";
import { cn } from "@/lib/utils";

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

function formatDateTimeEn(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function UserManageDialogInner({
  summaryUser,
  viewerIsSuperAdmin,
}: {
  summaryUser: AdminUserSummary;
  viewerIsSuperAdmin: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "activity" | "courses" | "devices" | "notes">("profile");

  const { data: userDetail, isLoading } = useAdminUserDetail(summaryUser.id);
  const user = userDetail ?? summaryUser;

  const updateUserProfile = useAdminUpdateUserProfile();
  const kickDevice = useAdminKickDevice();
  const grantCourse = useAdminGrantCourseAccess();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const resetPassword = useResetUserPassword();
  const resetDevices = useResetUserDevices();
  const assignRole = useAssignRole();
  const revokeRole = useRevokeRole();
  const suspendTeacher = useSuspendTeacher();
  const reactivateTeacher = useReactivateTeacher();
  const softDelete = useSoftDeleteUser();
  const restore = useRestoreUser();

  const { data: allCourses } = useCourses();

  // Form states with fallback to current values
  const [firstName, setFirstName] = useState(summaryUser.first_name ?? "");
  const [lastName, setLastName] = useState(summaryUser.last_name ?? "");
  const [phone, setPhone] = useState(summaryUser.phone ?? "");
  const [parentPhone, setParentPhone] = useState(summaryUser.parent_phone ?? "");
  const [grade, setGrade] = useState(summaryUser.grade ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [adminNotes, setAdminNotes] = useState(summaryUser.admin_notes ?? "");
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("");
  const [teacherDisplayName, setTeacherDisplayName] = useState("");

  useEffect(() => {
    if (userDetail) {
      if (userDetail.first_name !== undefined) setFirstName(userDetail.first_name ?? "");
      if (userDetail.last_name !== undefined) setLastName(userDetail.last_name ?? "");
      if (userDetail.phone !== undefined) setPhone(userDetail.phone ?? "");
      if (userDetail.parent_phone !== undefined) setParentPhone(userDetail.parent_phone ?? "");
      if (userDetail.grade !== undefined) setGrade(userDetail.grade ?? "");
      if (userDetail.admin_notes !== undefined) setAdminNotes(userDetail.admin_notes ?? "");
    }
  }, [userDetail]);

  const assignableRoles = viewerIsSuperAdmin
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter((r) => !PRIVILEGED_ROLES.includes(r));

  const onSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile.mutate(
      {
        id: user.id,
        input: {
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          phone: phone.trim() || "",
          parent_phone: parentPhone.trim() || null,
          grade: grade || null,
          ...(newPassword.trim().length >= 6 ? { password: newPassword.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث بيانات المستخدم بنجاح");
          setNewPassword("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث البيانات")),
      },
    );
  };

  const onSaveNotes = () => {
    updateUserProfile.mutate(
      {
        id: user.id,
        input: { admin_notes: adminNotes },
      },
      toastHandlers("تم حفظ ملاحظات الإدارة"),
    );
  };

  const onKickDevice = (deviceId: string) => {
    kickDevice.mutate(
      { userId: user.id, deviceId },
      toastHandlers("تم طرد الجهاز بنجاح"),
    );
  };

  const onGrantCourse = () => {
    if (!selectedCourseToGrant) return;
    grantCourse.mutate(
      { userId: user.id, courseId: selectedCourseToGrant },
      {
        onSuccess: () => {
          toast.success("تم منح الوصول للكورس بنجاح");
          setSelectedCourseToGrant("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر منح الوصول للكورس")),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DialogTitle className="text-h3 flex items-center gap-2">
            <span>{user.first_name || "مستخدم"} {user.last_name || ""}</span>
            {user.user_code && (
              <Badge variant="outline" className="font-mono text-primary border-primary">
                #GOG-{user.user_code}
              </Badge>
            )}
          </DialogTitle>
        </div>
        <DialogDescription className="flex flex-wrap items-center gap-2 pt-1 text-small">
          <span>{user.email}</span>
          {user.phone && (
            <>
              <span>•</span>
              <span>هاتف: <span dir="ltr">{user.phone}</span></span>
            </>
          )}
          {user.parent_phone && (
            <>
              <span>•</span>
              <span>ولي الأمر: <span dir="ltr">{user.parent_phone}</span></span>
            </>
          )}
          {user.last_sign_in_at && (
            <>
              <span>•</span>
              <span>آخر دخول: <span dir="ltr" className="font-medium text-foreground">{formatDateTimeEn(user.last_sign_in_at)}</span></span>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      {/* Tab Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-border gap-2 pb-3 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-small font-medium transition-colors border",
            activeTab === "profile"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
          )}
        >
          <User className="size-4" />
          البيانات والحساب
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-small font-medium transition-colors border",
            activeTab === "activity"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
          )}
        >
          <GraduationCap className="size-4" />
          نشاط ومستوى الطالب
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-small font-medium transition-colors border",
            activeTab === "courses"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
          )}
        >
          <BookOpen className="size-4" />
          الكورسات ({userDetail?.courses?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("devices")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-small font-medium transition-colors border",
            activeTab === "devices"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
          )}
        >
          <Smartphone className="size-4" />
          الأجهزة ({userDetail?.devices?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-small font-medium transition-colors border",
            activeTab === "notes"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
          )}
        >
          <FileText className="size-4" />
          ملاحظات الإدارة
        </button>
      </div>

      {/* Status badges */}
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

      {/* Tab 1: Profile & Account */}
      {activeTab === "profile" && (
        <div className="flex flex-col gap-5 pt-2">
          <form onSubmit={onSaveProfile} className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-muted/20">
            <h3 className="font-semibold text-small">تعديل بيانات المستخدم</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="u-first-name">الاسم الأول</Label>
                <Input id="u-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="u-last-name">اسم العائلة</Label>
                <Input id="u-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="u-phone">رقم هاتف الطالب / الواتساب</Label>
                <Input id="u-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="u-parent-phone">رقم هاتف ولي الأمر</Label>
                <Input id="u-parent-phone" dir="ltr" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="u-grade">الصف الدراسي</Label>
              <Select value={grade} onValueChange={(val) => setGrade(val as string)}>
                <SelectTrigger id="u-grade">
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grade1">أولى ثانوي</SelectItem>
                  <SelectItem value="grade2">ثانية ثانوي</SelectItem>
                  <SelectItem value="grade3">ثالثة ثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="u-new-password">تعيين كلمة مرور جديدة (اختياري)</Label>
              <Input
                id="u-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="سيبه فاضي لو مش عايز تغيّر الباسورد"
              />
            </div>

            <Button type="submit" disabled={updateUserProfile.isPending} className="w-fit mt-1">
              حفظ التعديلات
            </Button>
          </form>

          {/* Quick action buttons */}
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-small">إجراءات الحساب السريعة</h3>
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
                  <Ban className="size-4" />
                  حظر المستخدم
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                disabled={resetPassword.isPending}
                onClick={() => resetPassword.mutate({ id: user.id, input: undefined }, toastHandlers("تم إرسال رابط إعادة تعيين الباسورد"))}
              >
                <KeyRound className="size-4" />
                إرسال رابط إعادة تعيين
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={resetDevices.isPending}
                onClick={() => resetDevices.mutate({ id: user.id, input: undefined }, toastHandlers("تم إعادة ضبط جميع الأجهزة"))}
              >
                <RotateCcw className="size-4" />
                تسجيل خروج كل الأجهزة
              </Button>

              {user.is_teacher && (
                user.teacher_status === "suspended" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reactivateTeacher.isPending}
                    onClick={() => reactivateTeacher.mutate({ id: user.id, input: undefined }, toastHandlers("تم إعادة تفعيل المدرس"))}
                  >
                    إعادة تفعيل المدرس
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={suspendTeacher.isPending}
                    onClick={() => suspendTeacher.mutate({ id: user.id, input: undefined }, toastHandlers("تم إيقاف المدرس"))}
                  >
                    إيقاف المدرس
                  </Button>
                )
              )}

              {user.deleted_at ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate({ id: user.id, input: undefined }, toastHandlers("تم استرجاع الحساب"))}
                >
                  استرجاع الحساب المحذوف
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={softDelete.isPending}
                  onClick={() => softDelete.mutate({ id: user.id, input: undefined }, toastHandlers("تم نقل الحساب لسلة المحذوفات"))}
                >
                  <Trash2 className="size-4" />
                  حذف الحساب
                </Button>
              )}
            </div>
          </div>

          {/* Roles management */}
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <h3 className="font-semibold text-small">إدارة الأدوار والصلاحيات</h3>
            <div className="flex flex-wrap gap-1.5">
              {user.roles.map((r) => (
                <Badge key={r} variant="outline" className="flex items-center gap-1">
                  {r}
                  {user.roles.length > 1 && (
                    <button
                      type="button"
                      className="text-destructive hover:font-bold ms-1"
                      disabled={revokeRole.isPending}
                      onClick={() => revokeRole.mutate({ id: user.id, input: { role_name: r } }, toastHandlers(`تم سحب دور ${r}`))}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <Select value={roleToAssign} onValueChange={(val) => setRoleToAssign(val as string)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="إسناد دور جديد" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles
                    .filter((r) => !user.roles.includes(r))
                    .map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === "teacher"
                          ? "مدرس (teacher)"
                          : r === "student"
                            ? "طالب (student)"
                            : r === "parent"
                              ? "ولي أمر (parent)"
                              : r === "admin"
                                ? "أدمن (admin)"
                                : r === "super_admin"
                                  ? "سوبر أدمن (super_admin)"
                                  : r === "moderator"
                                    ? "مشرف (moderator)"
                                    : r === "support"
                                      ? "دعم فني (support)"
                                      : r === "content_manager"
                                        ? "مدير محتوى (content_manager)"
                                        : r === "accountant"
                                          ? "محاسب (accountant)"
                                          : r}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {roleToAssign === "teacher" && (
                <Input
                  className="w-56 text-small"
                  placeholder={`اسم المدرس (افتراضي: ${[firstName, lastName].filter(Boolean).join(" ") || "مدرس"})`}
                  value={teacherDisplayName}
                  onChange={(e) => setTeacherDisplayName(e.target.value)}
                />
              )}
              <Button
                size="sm"
                disabled={!roleToAssign || assignRole.isPending}
                onClick={() => {
                  const nameToSend =
                    roleToAssign === "teacher"
                      ? teacherDisplayName.trim() || [firstName, lastName].filter(Boolean).join(" ").trim() || undefined
                      : undefined;
                  assignRole.mutate(
                    {
                      id: user.id,
                      input: {
                        role_name: roleToAssign,
                        ...(nameToSend ? { teacher_display_name: nameToSend } : {}),
                      },
                    },
                    toastHandlers(`تم إسناد دور ${roleToAssign}`),
                  );
                  setRoleToAssign("");
                  setTeacherDisplayName("");
                }}
              >
                <Plus className="size-4" />
                إضافة الدور
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Academic Activity & Level */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-5 pt-2">
          {isLoading && <Skeleton className="h-64 w-full" />}

          {!isLoading && (
            <>
              {/* Top Summary Cards: Parent Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Latest Exam Card */}
                <div className="rounded-xl border border-border p-3.5 bg-muted/20 flex flex-col justify-between gap-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-muted-foreground font-medium flex items-center gap-1">
                      <GraduationCap className="size-3.5 text-primary" />
                      آخر اختبار تم تقديمه
                    </span>
                    {userDetail?.academic_activity?.latest_exam && (
                      <Badge
                        variant={userDetail.academic_activity.latest_exam.passed ? "default" : "destructive"}
                        className="text-caption"
                      >
                        {userDetail.academic_activity.latest_exam.passed ? "ناجح" : "راسب"}
                      </Badge>
                    )}
                  </div>
                  {userDetail?.academic_activity?.latest_exam ? (
                    <div>
                      <div className="text-h3 font-bold text-foreground font-mono">
                        {userDetail.academic_activity.latest_exam.score_percent}%
                      </div>
                      <p className="text-small font-medium truncate mt-0.5" title={userDetail.academic_activity.latest_exam.title}>
                        {userDetail.academic_activity.latest_exam.title}
                      </p>
                      {userDetail.academic_activity.latest_exam.course_title && (
                        <p className="text-caption text-muted-foreground truncate">
                          كورس: {userDetail.academic_activity.latest_exam.course_title}
                        </p>
                      )}
                      <p dir="ltr" className="text-caption text-muted-foreground text-start mt-1">
                        {formatDateTimeEn(userDetail.academic_activity.latest_exam.submitted_at)}
                      </p>
                    </div>
                  ) : (
                    <div className="py-3 text-center text-caption text-muted-foreground/70">
                      لم يقم بحل أي اختبارات بعد
                    </div>
                  )}
                </div>

                {/* Latest Quiz Card */}
                <div className="rounded-xl border border-border p-3.5 bg-muted/20 flex flex-col justify-between gap-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-muted-foreground font-medium flex items-center gap-1">
                      <Award className="size-3.5 text-secondary" />
                      آخر تدريب / كويز
                    </span>
                    {userDetail?.academic_activity?.latest_quiz && (
                      <Badge
                        variant={userDetail.academic_activity.latest_quiz.passed ? "secondary" : "outline"}
                        className="text-caption"
                      >
                        {userDetail.academic_activity.latest_quiz.passed ? "اجتاز" : "لم يجتز"}
                      </Badge>
                    )}
                  </div>
                  {userDetail?.academic_activity?.latest_quiz ? (
                    <div>
                      <div className="text-h3 font-bold text-foreground font-mono">
                        {userDetail.academic_activity.latest_quiz.score_percent}%
                      </div>
                      <p className="text-small font-medium truncate mt-0.5" title={userDetail.academic_activity.latest_quiz.title}>
                        {userDetail.academic_activity.latest_quiz.title}
                      </p>
                      {userDetail.academic_activity.latest_quiz.lesson_title && (
                        <p className="text-caption text-muted-foreground truncate">
                          درس: {userDetail.academic_activity.latest_quiz.lesson_title}
                        </p>
                      )}
                      <p dir="ltr" className="text-caption text-muted-foreground text-start mt-1">
                        {formatDateTimeEn(userDetail.academic_activity.latest_quiz.submitted_at)}
                      </p>
                    </div>
                  ) : (
                    <div className="py-3 text-center text-caption text-muted-foreground/70">
                      لم يقم بحل أي تدريبات بعد
                    </div>
                  )}
                </div>

                {/* Overall Academic Evaluation */}
                <div className="rounded-xl border border-border p-3.5 bg-muted/20 flex flex-col justify-between gap-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-muted-foreground font-medium flex items-center gap-1">
                      <TrendingUp className="size-3.5 text-amber-500" />
                      المستوى والتقييم العام
                    </span>
                  </div>
                  {(() => {
                    const avgE = userDetail?.academic_activity?.average_exam_score;
                    const avgQ = userDetail?.academic_activity?.average_quiz_score;
                    const combined =
                      avgE !== null && avgE !== undefined && avgQ !== null && avgQ !== undefined
                        ? Math.round((avgE + avgQ) / 2)
                        : avgE !== null && avgE !== undefined
                        ? avgE
                        : avgQ !== null && avgQ !== undefined
                        ? avgQ
                        : null;

                    if (combined === null) {
                      return (
                        <div className="py-3 text-center text-caption text-muted-foreground/70">
                          لا توجد بيانات كافية للتقييم
                        </div>
                      );
                    }

                    const label =
                      combined >= 90
                        ? "ممتاز 🌟"
                        : combined >= 80
                        ? "جيد جداً 👏"
                        : combined >= 65
                        ? "جيد 👍"
                        : "يحتاج متابعة ⚠️";

                    return (
                      <div>
                        <div className="text-h3 font-bold text-foreground font-mono">
                          {combined}%
                        </div>
                        <p className="text-small font-semibold text-primary mt-0.5">
                          {label}
                        </p>
                        <div className="text-caption text-muted-foreground mt-1 flex flex-col gap-0.5">
                          <span>متوسط الاختبارات: {avgE !== null && avgE !== undefined ? `${avgE}%` : "-"}</span>
                          <span>متوسط التدريبات: {avgQ !== null && avgQ !== undefined ? `${avgQ}%` : "-"}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Engagement & Gamification Card */}
                <div className="rounded-xl border border-border p-3.5 bg-muted/20 flex flex-col justify-between gap-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-muted-foreground font-medium flex items-center gap-1">
                      <Trophy className="size-3.5 text-yellow-500" />
                      الالتزام والحضور
                    </span>
                    <Badge variant="outline" className="font-mono text-caption">
                      Level {userDetail?.academic_activity?.gamification?.level ?? 1}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 mt-1">
                    <div className="flex items-center justify-between text-small">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Flame className="size-4 text-orange-500" /> الحضور المتواصل:
                      </span>
                      <span className="font-bold text-foreground">
                        {userDetail?.academic_activity?.gamification?.current_streak_days ?? 0} يوم
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-small">
                      <span className="text-muted-foreground">إجمالي النقاط (XP):</span>
                      <span className="font-mono font-semibold text-foreground">
                        {userDetail?.academic_activity?.gamification?.xp_total?.toLocaleString() ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-small">
                      <span className="text-muted-foreground">إجمالي الاختبارات:</span>
                      <span className="font-semibold text-foreground">
                        {userDetail?.academic_activity?.total_exams_taken ?? 0} اختبار
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Exams History */}
              <div className="rounded-xl border border-border overflow-hidden mt-1">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <h4 className="font-semibold text-small flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" />
                    سجل الاختبارات المنجزة ({userDetail?.academic_activity?.exam_attempts?.length ?? 0})
                  </h4>
                </div>
                {(!userDetail?.academic_activity?.exam_attempts || userDetail.academic_activity.exam_attempts.length === 0) ? (
                  <p className="py-6 text-center text-small text-muted-foreground">لم يقم الطالب بتسليم أي اختبارات بعد.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم الاختبار</TableHead>
                        <TableHead>الكورس</TableHead>
                        <TableHead className="text-center">الدرجة</TableHead>
                        <TableHead className="text-center">النتيجة</TableHead>
                        <TableHead>تاريخ ووقت الحل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDetail.academic_activity.exam_attempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium text-small">{attempt.title}</TableCell>
                          <TableCell className="text-muted-foreground text-small">{attempt.course_title ?? "-"}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-small">
                            {attempt.score_percent}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={attempt.passed ? "default" : "destructive"} className="text-caption">
                              {attempt.passed ? "ناجح" : "راسب"}
                            </Badge>
                          </TableCell>
                          <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                            {formatDateTimeEn(attempt.submitted_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Detailed Quizzes History */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <h4 className="font-semibold text-small flex items-center gap-2">
                    <Award className="size-4 text-secondary" />
                    سجل التدريبات والكويزات المنجزة ({userDetail?.academic_activity?.quiz_attempts?.length ?? 0})
                  </h4>
                </div>
                {(!userDetail?.academic_activity?.quiz_attempts || userDetail.academic_activity.quiz_attempts.length === 0) ? (
                  <p className="py-6 text-center text-small text-muted-foreground">لم يقم الطالب بتسليم أي تدريبات بعد.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم التدريب / الكويز</TableHead>
                        <TableHead>الدرس</TableHead>
                        <TableHead className="text-center">الدرجة</TableHead>
                        <TableHead className="text-center">النتيجة</TableHead>
                        <TableHead>تاريخ ووقت الحل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDetail.academic_activity.quiz_attempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium text-small">{attempt.title}</TableCell>
                          <TableCell className="text-muted-foreground text-small">{attempt.lesson_title ?? "-"}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-small">
                            {attempt.score_percent}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={attempt.passed ? "secondary" : "outline"} className="text-caption">
                              {attempt.passed ? "اجتاز" : "لم يجتز"}
                            </Badge>
                          </TableCell>
                          <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                            {formatDateTimeEn(attempt.submitted_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Devices & Login History */}
      {activeTab === "devices" && (
        <div className="flex flex-col gap-5 pt-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-small">الأجهزة النشطة حالياً</h3>
              <Button
                size="sm"
                variant="outline"
                disabled={resetDevices.isPending}
                onClick={() => resetDevices.mutate({ id: user.id, input: undefined }, toastHandlers("تم طرد جميع الأجهزة"))}
              >
                طرد جميع الأجهزة
              </Button>
            </div>

            {isLoading && <Skeleton className="h-24 w-full" />}
            {!isLoading && (!userDetail?.devices || userDetail.devices.length === 0) && (
              <p className="text-small text-muted-foreground py-2">لا توجد أجهزة مسجلة حالياً.</p>
            )}

            {!isLoading && userDetail?.devices && userDetail.devices.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الجهاز / المتصفح</TableHead>
                      <TableHead>عنوان الـ IP</TableHead>
                      <TableHead>آخر نشاط</TableHead>
                      <TableHead>إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userDetail.devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium text-small flex items-center gap-2">
                          <Laptop className="size-4 text-muted-foreground" />
                          <span className="truncate max-w-[180px]" title={device.user_agent ?? ""}>
                            {device.user_agent ?? "جهاز غير معروف"}
                          </span>
                        </TableCell>
                        <TableCell dir="ltr" className="text-small text-muted-foreground">
                          {device.ip_address ?? "-"}
                        </TableCell>
                        <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                          {formatDateTimeEn(device.last_active_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={kickDevice.isPending}
                            onClick={() => onKickDevice(device.id)}
                          >
                            طرد
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Login History */}
          <div className="border-t border-border pt-3">
            <h3 className="font-semibold text-small mb-2">سجل آخر عمليات تسجيل دخول</h3>
            {isLoading && <Skeleton className="h-32 w-full" />}
            {!isLoading && (!userDetail?.login_history || userDetail.login_history.length === 0) && (
              <p className="text-small text-muted-foreground py-2">لا توجد سجلات دخول مسجلة.</p>
            )}
            {!isLoading && userDetail?.login_history && userDetail.login_history.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>وقت تسجيل الدخول</TableHead>
                      <TableHead>عنوان الـ IP</TableHead>
                      <TableHead>المتصفح / الجهاز</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userDetail.login_history.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell dir="ltr" className="text-small text-start">
                          {formatDateTimeEn(log.created_at)}
                        </TableCell>
                        <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                          {log.ip ?? "-"}
                        </TableCell>
                        <TableCell className="text-small text-muted-foreground truncate max-w-[200px]" title={log.user_agent ?? ""}>
                          {log.user_agent ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Courses & Access */}
      {activeTab === "courses" && (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-muted/20">
            <h3 className="font-semibold text-small">منح وصول يدوي لكورس</h3>
            <div className="flex gap-2">
              <Select value={selectedCourseToGrant} onValueChange={(val) => setSelectedCourseToGrant(val as string)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر الكورس لمنحه للطالب" />
                </SelectTrigger>
                <SelectContent>
                  {(allCourses ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedCourseToGrant || grantCourse.isPending}
                onClick={onGrantCourse}
              >
                منح الوصول
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-small mb-2">الكورسات المتاحة للمستخدم</h3>
            {isLoading && <Skeleton className="h-24 w-full" />}
            {!isLoading && (!userDetail?.courses || userDetail.courses.length === 0) && (
              <p className="text-small text-muted-foreground py-2">المستخدم غير مشترك في أي كورسات حالياً.</p>
            )}
            {!isLoading && userDetail?.courses && userDetail.courses.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكورس</TableHead>
                      <TableHead>نوع الاشتراك / المصدر</TableHead>
                      <TableHead>تاريخ المنح</TableHead>
                      <TableHead>آخر فتح للكورس</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userDetail.courses.map((course) => (
                      <TableRow key={course.course_id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {course.source === "admin_grant" ? "منح من الإدارة" : course.source === "purchase" ? "شراء مباشر" : course.source}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                          {formatDateTimeEn(course.granted_at)}
                        </TableCell>
                        <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                          {course.last_opened_at ? (
                            formatDateTimeEn(course.last_opened_at)
                          ) : (
                            <span className="text-muted-foreground/60">لم يبدأ بعد</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Admin Notes */}
      {activeTab === "notes" && (
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-caption text-muted-foreground">
            هذه الملاحظات سرية وخاصة بالإدارة فقط، ولا يستطيع المستخدم أو الطالب رؤيتها أبداً.
          </p>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={5}
            placeholder="اكتب ملاحظات داخلية حول الطالب أو متابعة ولي أمره أو أي تفاصيل خاصة..."
          />
          <Button
            className="w-fit"
            disabled={updateUserProfile.isPending}
            onClick={onSaveNotes}
          >
            حفظ الملاحظات
          </Button>
        </div>
      )}
    </>
  );
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {open && (
          <UserManageDialogInner
            key={user.id}
            summaryUser={user}
            viewerIsSuperAdmin={viewerIsSuperAdmin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
