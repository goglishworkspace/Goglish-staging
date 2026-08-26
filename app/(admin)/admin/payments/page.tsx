"use client";

import { useState } from "react";
import { Wallet, Receipt, Percent, ReceiptText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialReport } from "@/lib/api/queries/admin-finance";

function money(cents: number) {
  return `${(cents / 100).toLocaleString("ar-EG")} ج.م`;
}

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

export default function AdminPaymentsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: report, isLoading } = useFinancialReport(from || undefined, to || undefined);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">المدفوعات والتقارير المالية</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">من تاريخ</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">إلى تاريخ</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        </div>
      </div>

      {isLoading && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && report && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Wallet} label="الإيرادات" value={money(report.revenue_cents)} />
            <StatCard icon={Receipt} label="صافي الإيرادات" value={money(report.net_revenue_cents)} />
            <StatCard icon={Percent} label="الضرائب المحصّلة" value={money(report.tax_collected_cents)} />
            <StatCard icon={ReceiptText} label="الخصومات" value={money(report.discounts_given_cents)} />
            <StatCard icon={Wallet} label="المبالغ المستردة" value={money(report.refunds_cents)} />
            <StatCard icon={Receipt} label="عدد الفواتير" value={report.invoices_count} />
            <StatCard icon={Percent} label="معدل التحويل" value={`${(report.conversion_rate * 100).toFixed(1)}%`} />
            <StatCard icon={ReceiptText} label="طلبات مكتملة / إجمالي" value={`${report.orders_completed} / ${report.orders_created}`} />
          </div>

          <div className="w-full">
            <h2 className="mb-3 text-h3 text-secondary dark:text-white">الاشتراكات النشطة حسب النوع</h2>
            {Object.keys(report.active_subscriptions_by_plan).length === 0 ? (
              <p className="text-small text-muted-foreground">لا يوجد اشتراكات نشطة.</p>
            ) : (
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(report.active_subscriptions_by_plan).map(([kind, count]) => (
                  <Card key={kind} className="w-full">
                    <CardContent className="p-4 text-center">
                      <p className="text-h3 text-secondary dark:text-white">{count}</p>
                      <p className="text-caption text-muted-foreground">{kind}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
