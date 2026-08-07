"use client";

import { Users, GraduationCap, BookOpen, BadgeCheck, CreditCard, MessageSquareWarning, FileClock, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboardStats } from "@/lib/api/queries/admin-dashboard";

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-caption text-muted-foreground">{label}</p>
          <p className="truncate text-h3 text-secondary dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminDashboardStats();

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">نظرة عامة</h1>

      {isLoading && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && stats && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="عدد الطلاب" value={stats.students_count} />
          <StatCard icon={GraduationCap} label="عدد المدرسين" value={stats.teachers_count} />
          <StatCard icon={BookOpen} label="إجمالي الكورسات" value={stats.courses_count} />
          <StatCard icon={BadgeCheck} label="الكورسات المنشورة" value={stats.published_courses_count} />
          <StatCard icon={CreditCard} label="الاشتراكات النشطة" value={stats.active_subscriptions_count} />
          <StatCard icon={MessageSquareWarning} label="تعليقات في انتظار المراجعة" value={stats.pending_comments_count} />
          <StatCard icon={FileClock} label="محتوى في انتظار الموافقة" value={stats.pending_content_reviews_count} />
          <StatCard
            icon={Wallet}
            label="إجمالي الإيرادات"
            value={`${(stats.total_revenue_cents / 100).toLocaleString("ar-EG")} ج.م`}
          />
        </div>
      )}
    </div>
  );
}
