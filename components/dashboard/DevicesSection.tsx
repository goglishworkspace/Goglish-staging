"use client";

import { Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDevices, useRemoveDevice } from "@/lib/api/queries/devices";

export function DevicesSection() {
  const { data: devices, isLoading } = useDevices();
  const removeDevice = useRemoveDevice();

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h2 className="text-h3 text-secondary dark:text-white">الأجهزة</h2>
        <p className="mt-1 text-small text-muted-foreground">أقصى جهازين نشطين في نفس الوقت.</p>

        {isLoading && <Skeleton className="mt-4 h-16 w-full" />}

        {!isLoading && !devices?.length && (
          <p className="mt-4 text-small text-muted-foreground">مفيش أجهزة مسجّلة.</p>
        )}

        {!isLoading && !!devices?.length && (
          <ul className="mt-4 flex flex-col gap-2">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Smartphone className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-small">{device.user_agent ?? "جهاز غير معروف"}</span>
                  {device.is_active && (
                    <Badge variant="secondary" className="shrink-0">
                      نشط
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="إزالة الجهاز"
                  onClick={() => removeDevice.mutate(device.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
