"use client";

import { Star, Users, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContentStatusBadge } from "@/components/shared/ContentStatusBadge";
import { useMyTeacherReport } from "@/lib/api/queries/teacher";

function money(cents: number) {
  return `${(cents / 100).toLocaleString("ar-EG")} ج.م`;
}

function monthLabel(month: string) {
  return new Date(`${month}-01`).toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
}

export default function TeacherAnalyticsPage() {
  const { data: report, isLoading } = useMyTeacherReport();

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">التقارير والتحليلات</h1>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && report && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="w-full">
              <CardContent className="flex items-center gap-3 p-5">
                <Star className="size-8 text-primary" />
                <div>
                  <p className="text-caption text-muted-foreground">تقييمك</p>
                  <p className="text-h3 text-secondary dark:text-white">
                    {report.rating_avg.toFixed(1)} ({report.rating_count})
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="flex items-center gap-3 p-5">
                <Users className="size-8 text-primary" />
                <div>
                  <p className="text-caption text-muted-foreground">إجمالي الطلاب</p>
                  <p className="text-h3 text-secondary dark:text-white">
                    {report.courses.reduce((sum, c) => sum + c.students_count, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="flex items-center gap-3 p-5">
                <Wallet className="size-8 text-primary" />
                <div>
                  <p className="text-caption text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="text-h3 text-secondary dark:text-white">{money(report.total_revenue_cents)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-h3 text-secondary dark:text-white">الإيرادات الشهرية</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الشهر</TableHead>
                <TableHead>الإيرادات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.monthly_revenue.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{monthLabel(row.month)}</TableCell>
                  <TableCell>{money(row.revenue_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h2 className="text-h3 text-secondary dark:text-white">تحليلات الطلاب حسب الكورس</h2>
          {!report.courses.length ? (
            <p className="text-small text-muted-foreground">لسه معندكش كورسات لعرض تحليلاتها.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكورس</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>عدد الطلاب</TableHead>
                  <TableHead>متوسط الإنجاز</TableHead>
                  <TableHead>متوسط درجات الاختبارات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.courses.map((course) => (
                  <TableRow key={course.course_id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>
                      <ContentStatusBadge status={course.status} />
                    </TableCell>
                    <TableCell>{course.students_count}</TableCell>
                    <TableCell>{course.avg_completion_percent}%</TableCell>
                    <TableCell>{course.avg_quiz_score_percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
