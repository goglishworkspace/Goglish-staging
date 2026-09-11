"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Download, ArrowUpDown, Trophy, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserManageDialog } from "@/components/admin/UserManageDialog";
import { useAdminUsers, type AdminUserSummary } from "@/lib/api/queries/admin-users";
import { useProfile } from "@/lib/api/queries/profile";

type SortOption =
  | "newest"
  | "oldest"
  | "highest_exam"
  | "highest_quiz"
  | "most_xp"
  | "last_sign_in"
  | "last_course_opened"
  | "most_courses";

const gradeLabels: Record<string, string> = {
  grade1: "الصف الأول الثانوي",
  grade2: "الصف الثاني الثانوي",
  grade3: "الصف الثالث الثانوي",
};

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

function getStudentMedal(index: number, sortBy: SortOption, user: AdminUserSummary) {
  const isCompetitive = sortBy === "highest_exam" || sortBy === "highest_quiz" || sortBy === "most_xp";
  if (!isCompetitive) return null;
  if (sortBy === "highest_exam" && (!user.latest_exam || user.latest_exam.score_percent <= 0)) return null;
  if (sortBy === "highest_quiz" && (!user.latest_quiz || user.latest_quiz.score_percent <= 0)) return null;
  if (sortBy === "most_xp" && (!user.xp_total || user.xp_total <= 0)) return null;

  if (index === 0) return { icon: "🥇", label: "الأول", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold" };
  if (index === 1) return { icon: "🥈", label: "الثاني", className: "bg-slate-300/25 text-slate-700 dark:text-slate-300 border-slate-400/30 font-bold" };
  if (index === 2) return { icon: "🥉", label: "الثالث", className: "bg-amber-700/15 text-amber-800 dark:text-amber-600 border-amber-700/30 font-bold" };
  return null;
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);
  const { data: profile } = useProfile();

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: users, isLoading, isError, refetch } = useAdminUsers(debounced || undefined);
  const viewerIsSuperAdmin = !!users?.find((u) => u.id === profile?.id)?.roles.includes("super_admin");

  const isCompetitiveSort = sortBy === "highest_exam" || sortBy === "highest_quiz" || sortBy === "most_xp";

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const list = users.filter((user) => {
      if (selectedRole !== "all") {
        if (selectedRole === "admin_group") {
          if (!user.roles.includes("admin") && !user.roles.includes("super_admin")) return false;
        } else if (!user.roles.includes(selectedRole)) {
          return false;
        }
      }

      if (selectedStatus !== "all") {
        if (selectedStatus === "banned" && !user.banned) return false;
        if (selectedStatus === "deleted" && !user.deleted_at) return false;
        if (selectedStatus === "active" && (user.banned || user.deleted_at)) return false;
      }

      if (selectedGrade !== "all") {
        if (user.grade !== selectedGrade) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "highest_exam": {
          const scoreA = a.latest_exam?.score_percent ?? -1;
          const scoreB = b.latest_exam?.score_percent ?? -1;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case "highest_quiz": {
          const scoreA = a.latest_quiz?.score_percent ?? -1;
          const scoreB = b.latest_quiz?.score_percent ?? -1;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case "most_xp": {
          const xpA = a.xp_total ?? 0;
          const xpB = b.xp_total ?? 0;
          if (xpB !== xpA) return xpB - xpA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case "last_sign_in": {
          const timeA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
          const timeB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
          return timeB - timeA;
        }
        case "last_course_opened": {
          const timeA = a.last_course_opened_at ? new Date(a.last_course_opened_at).getTime() : 0;
          const timeB = b.last_course_opened_at ? new Date(b.last_course_opened_at).getTime() : 0;
          return timeB - timeA;
        }
        case "most_courses": {
          const countA = a.courses_count ?? 0;
          const countB = b.courses_count ?? 0;
          if (countB !== countA) return countB - countA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case "oldest": {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        case "newest":
        default: {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      }
    });

    return list;
  }, [users, selectedRole, selectedStatus, selectedGrade, sortBy]);

  const exportCsv = () => {
    if (!filteredUsers || filteredUsers.length === 0) return;

    const headers = [
      "الترتيب",
      "كود المستخدم",
      "الاسم",
      "الإيميل",
      "رقم التليفون",
      "هاتف ولي الأمر",
      "الصف الدراسي",
      "نقاط XP",
      "عدد الكورسات",
      "آخر فتح للكورس",
      "آخر اختبار",
      "درجة آخر اختبار",
      "آخر تدريب",
      "درجة آخر تدريب",
      "الأدوار",
      "الحالة",
      "آخر تسجيل دخول",
      "تاريخ الإنشاء",
    ];

    const rows = filteredUsers.map((u, index) => [
      index + 1,
      u.user_code ? `GOG-${u.user_code}` : "-",
      `"${(u.first_name ?? "") + " " + (u.last_name ?? "")}"`,
      u.email,
      `"${u.phone ?? "-"}"`,
      `"${u.parent_phone ?? "-"}"`,
      `"${gradeLabels[u.grade ?? ""] ?? u.grade ?? "-"}"`,
      u.xp_total ?? 0,
      u.courses_count ?? 0,
      u.last_course_opened_at ? formatDateTimeEn(u.last_course_opened_at) : "لم يفتح بعد",
      u.latest_exam ? `"${u.latest_exam.title} (${u.latest_exam.passed ? "ناجح" : "راسب"})"` : "-",
      u.latest_exam ? `"${u.latest_exam.score_percent}%"` : "-",
      u.latest_quiz ? `"${u.latest_quiz.title} (${u.latest_quiz.passed ? "ناجح" : "راسب"})"` : "-",
      u.latest_quiz ? `"${u.latest_quiz.score_percent}%"` : "-",
      `"${u.roles.join(", ")}"`,
      u.deleted_at ? "محذوف" : u.banned ? "محظور" : "نشط",
      u.last_sign_in_at ? formatDateTimeEn(u.last_sign_in_at) : "-",
      formatDateTimeEn(u.created_at),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `goglish_users_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 text-secondary dark:text-white">إدارة المستخدمين</h1>
          <p className="text-small text-muted-foreground mt-1">
            إجمالي المستخدمين: <span className="font-bold text-foreground">{users?.length ?? 0}</span>
            {filteredUsers.length !== (users?.length ?? 0) && (
              <span className="ms-2 text-caption text-primary">
                (المطابق للفلتر: {filteredUsers.length})
              </span>
            )}
          </p>
        </div>

        <Button onClick={exportCsv} variant="outline" className="gap-2" disabled={!filteredUsers.length}>
          <Download className="size-4" />
          تصدير إلى Excel / CSV
        </Button>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-small font-medium">حدث خطأ أثناء تحميل المستخدمين من الخادم.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، الإيميل، رقم التليفون، أو كود الطالب..."
            className="ps-9"
          />
        </div>

        {/* Sort By Dropdown */}
        <div className="w-56">
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
            <SelectTrigger>
              <ArrowUpDown className="me-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">🕒 الأحدث تسجيلاً</SelectItem>
              <SelectItem value="highest_exam">🏆 أعلى درجات الاختبارات</SelectItem>
              <SelectItem value="highest_quiz">⭐ أعلى درجات التدريبات</SelectItem>
              <SelectItem value="most_xp">⚡ الأعلى في نقاط XP</SelectItem>
              <SelectItem value="last_sign_in">🟢 آخر تسجيل دخول (ظهور)</SelectItem>
              <SelectItem value="last_course_opened">📖 آخر فتح للكورس (مذاكرة)</SelectItem>
              <SelectItem value="most_courses">📚 الأكثر اشتراكاً بالكورسات</SelectItem>
              <SelectItem value="oldest">📅 الأقدم تسجيلاً</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grade Filter */}
        <div className="w-44">
          <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val as string)}>
            <SelectTrigger>
              <SelectValue placeholder="الصف الدراسي" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الصفوف</SelectItem>
              <SelectItem value="grade1">الصف الأول الثانوي</SelectItem>
              <SelectItem value="grade2">الصف الثاني الثانوي</SelectItem>
              <SelectItem value="grade3">الصف الثالث الثانوي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Role Filter */}
        <div className="w-40">
          <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as string)}>
            <SelectTrigger>
              <SelectValue placeholder="فلترة بالدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأدوار</SelectItem>
              <SelectItem value="student">الطلاب فقط</SelectItem>
              <SelectItem value="teacher">المدرسين فقط</SelectItem>
              <SelectItem value="parent">أولياء الأمور</SelectItem>
              <SelectItem value="admin_group">الإدارة والأدمن</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-36">
          <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as string)}>
            <SelectTrigger>
              <SelectValue placeholder="فلترة بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">النشطين فقط</SelectItem>
              <SelectItem value="banned">المحظورين</SelectItem>
              <SelectItem value="deleted">المحذوفين</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Competitive Sorting Info Banner */}
      {isCompetitiveSort && !isLoading && !!filteredUsers.length && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-small text-primary">
          <Trophy className="size-4 shrink-0 text-amber-500" />
          <span>
            {sortBy === "highest_exam" && "يتم الآن عرض الطلاب مرتبين تنازلياً حسب أعلى درجات الاختبارات لتسهيل تكريم وتوزيع الجوائز على الأوائل."}
            {sortBy === "highest_quiz" && "يتم الآن عرض الطلاب مرتبين تنازلياً حسب أعلى درجات التدريبات والكويزات."}
            {sortBy === "most_xp" && "يتم الآن عرض الطلاب مرتبين تنازلياً حسب أعلى نقاط XP والمذاكرة والتفاعل."}
          </span>
        </div>
      )}

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !filteredUsers.length && (
        <p className="py-8 text-center text-small text-muted-foreground">لا يوجد مستخدمين مطابقين للبحث أو الفلتر.</p>
      )}

      {!isLoading && !!filteredUsers.length && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود الطالب</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الإيميل</TableHead>
                <TableHead>هاتف الطالب</TableHead>
                <TableHead>هاتف ولي الأمر</TableHead>
                <TableHead className="text-center">الكورسات</TableHead>
                <TableHead>آخر فتح للكورس</TableHead>
                <TableHead>مستوى الطالب (آخر درجات)</TableHead>
                <TableHead>الأدوار</TableHead>
                <TableHead>آخر تسجيل دخول</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => {
                const medal = getStudentMedal(index, sortBy, user);
                return (
                  <TableRow key={user.id} className={medal ? "bg-primary/[0.03]" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {medal && (
                          <Badge variant="outline" className={`gap-1 px-1.5 py-0 font-medium ${medal.className}`} title={medal.label}>
                            <span>{medal.icon}</span>
                            <span className="text-caption">{medal.label}</span>
                          </Badge>
                        )}
                        {user.user_code ? (
                          <Badge variant="outline" className="font-mono text-primary border-primary">
                            #GOG-{user.user_code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-caption font-mono">
                            #{user.id.slice(0, 6)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground font-semibold">
                          {user.first_name || user.last_name
                            ? `${user.first_name ?? ""} ${user.last_name ?? ""}`
                            : "بدون اسم"}
                        </span>
                        {user.grade && (
                          <span className="text-caption text-muted-foreground font-normal">
                            {gradeLabels[user.grade] ?? user.grade}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-small">{user.email}</TableCell>
                    <TableCell dir="ltr" className="text-end text-muted-foreground text-small">
                      {user.phone ?? "-"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-end text-muted-foreground text-small">
                      {user.parent_phone ?? "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.courses_count > 0 ? "secondary" : "outline"} className="font-mono">
                        {user.courses_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                      {user.last_course_opened_at ? (
                        formatDateTimeEn(user.last_course_opened_at)
                      ) : (
                        <span className="text-muted-foreground/60">لم يفتح بعد</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-caption min-w-[120px]">
                        {user.latest_exam && (
                          <div className="flex items-center justify-between gap-1.5" title={user.latest_exam.title}>
                            <span className="text-muted-foreground truncate max-w-[70px]">اختبار:</span>
                            <Badge
                              variant={user.latest_exam.passed ? "default" : "destructive"}
                              className="px-1.5 py-0 text-caption font-mono"
                            >
                              {user.latest_exam.score_percent}%
                            </Badge>
                          </div>
                        )}
                        {user.latest_quiz && (
                          <div className="flex items-center justify-between gap-1.5" title={user.latest_quiz.title}>
                            <span className="text-muted-foreground truncate max-w-[70px]">تدريب:</span>
                            <Badge
                              variant={user.latest_quiz.passed ? "secondary" : "outline"}
                              className="px-1.5 py-0 text-caption font-mono"
                            >
                              {user.latest_quiz.score_percent}%
                            </Badge>
                          </div>
                        )}
                        {user.xp_total !== undefined && user.xp_total > 0 && (
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-muted-foreground text-caption">XP:</span>
                            <span className="font-mono text-caption font-bold text-primary">
                              {user.xp_total.toLocaleString("en-US")}
                            </span>
                          </div>
                        )}
                        {!user.latest_exam && !user.latest_quiz && (!user.xp_total || user.xp_total === 0) && (
                          <span className="text-muted-foreground/60 text-caption">لا توجد محاولات</span>
                        )}
                      </div>
                    </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-caption">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                    {user.last_sign_in_at ? (
                      formatDateTimeEn(user.last_sign_in_at)
                    ) : (
                      <span className="text-muted-foreground/60">لم يسجل بعد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.deleted_at ? (
                      <Badge variant="destructive">محذوف</Badge>
                    ) : user.banned ? (
                      <Badge variant="destructive">محظور</Badge>
                    ) : (
                      <Badge variant="default">نشط</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelected(user)}>
                      إدارة وتحكم
                    </Button>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selected && (
        <UserManageDialog
          user={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          viewerIsSuperAdmin={viewerIsSuperAdmin}
        />
      )}
    </div>
  );
}
