"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Smartphone, Monitor, Tablet, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useDevices, useRemoveDevice, type Device } from "@/lib/api/queries/devices";
import { parseUserAgent } from "@/lib/device-parser";

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 5) return "نشط الآن";
  if (diffMinutes < 60) return `آخر نشاط منذ ${diffMinutes} دقيقة`;
  if (diffHours < 24) return `آخر نشاط منذ ${diffHours} ساعة`;
  if (diffDays === 1) return "آخر نشاط أمس";
  if (diffDays < 7) return `آخر نشاط منذ ${diffDays} أيام`;
  return `آخر نشاط: ${date.toLocaleDateString("ar-EG")}`;
}

export function DevicesSection() {
  const { data: devices, isLoading } = useDevices();
  const removeDevice = useRemoveDevice();
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

  const confirmRemove = () => {
    if (!deviceToRemove) return;
    removeDevice.mutate(deviceToRemove.id, {
      onSuccess: () => {
        toast.success("تم إزالة الجهاز وتسجيل خروجه بنجاح");
        setDeviceToRemove(null);
      },
      onError: () => {
        toast.error("تعذر إزالة الجهاز، يرجى المحاولة لاحقاً");
      },
    });
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 text-secondary dark:text-white">الأجهزة المتصلة</h2>
            <p className="mt-1 text-small text-muted-foreground">
              يُسمح بحد أقصى جهازين نشطين في نفس الوقت لحماية حسابك ومحتواك.
            </p>
          </div>
          {devices && (
            <Badge variant="outline" className="text-caption">
              {devices.length} / 2 أجهزة
            </Badge>
          )}
        </div>

        {isLoading && <Skeleton className="mt-4 h-24 w-full rounded-xl" />}

        {!isLoading && !devices?.length && (
          <p className="mt-4 text-small text-muted-foreground">لا توجد أجهزة مسجّلة حالياً.</p>
        )}

        {!isLoading && !!devices?.length && (
          <ul className="mt-4 flex flex-col gap-3">
            {devices.map((device) => {
              const parsed = parseUserAgent(device.user_agent);
              const isCurrent = !!device.is_current;

              return (
                <li
                  key={device.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                    isCurrent
                      ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {parsed.type === "mobile" && <Smartphone className="size-5" />}
                      {parsed.type === "tablet" && <Tablet className="size-5" />}
                      {parsed.type === "desktop" && <Monitor className="size-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-small">{parsed.name}</span>
                        {isCurrent && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] py-0 px-2">
                            <CheckCircle2 className="size-3" />
                            هذا الجهاز الحالي
                          </Badge>
                        )}
                        {!isCurrent && device.is_active && (
                          <Badge variant="secondary" className="text-[11px] py-0 px-2">
                            متصل
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-caption text-muted-foreground mt-0.5">
                        <span>{parsed.browser}</span>
                        {device.last_active_at && (
                          <>
                            <span>•</span>
                            <span>{formatLastActive(device.last_active_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive self-end sm:self-center gap-1.5"
                    aria-label="تسجيل الخروج من هذا الجهاز"
                    disabled={removeDevice.isPending}
                    onClick={() => setDeviceToRemove(device)}
                  >
                    <Trash2 className="size-4" />
                    <span>تسجيل خروج</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={!!deviceToRemove} onOpenChange={(open) => !open && setDeviceToRemove(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد تسجيل الخروج من الجهاز</DialogTitle>
              <DialogDescription>
                {deviceToRemove?.is_current ? (
                  <span className="text-destructive font-medium block">
                    ⚠️ تحذير: هذا هو الجهاز الحالي الذي تستخدمه الآن! إزالته ستؤدي لتسجيل خروجك فوراً من المتصفح.
                  </span>
                ) : (
                  <span>
                    هل أنت متأكد من رغبتك في تسجيل الخروج من هذا الجهاز (
                    {parseUserAgent(deviceToRemove?.user_agent ?? null).name})؟
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose render={<Button variant="outline" />}>إلغاء</DialogClose>
              <Button
                variant="destructive"
                disabled={removeDevice.isPending}
                onClick={confirmRemove}
              >
                {removeDevice.isPending ? "جاري الإزالة..." : "تأكيد تسجيل الخروج"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

