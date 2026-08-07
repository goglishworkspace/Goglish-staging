"use client";

import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/lib/api/queries/notification-preferences";

const CHANNELS: { key: "email" | "sms" | "push" | "whatsapp"; label: string }[] = [
  { key: "email", label: "الإيميل" },
  { key: "sms", label: "الرسائل النصية" },
  { key: "push", label: "إشعارات الموقع" },
  { key: "whatsapp", label: "واتساب" },
];

export function NotificationSettingsSection() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
          <Bell className="size-5 text-primary" />
          إعدادات الإشعارات
        </h2>

        {isLoading && <Skeleton className="mt-4 h-32 w-full" />}

        {!isLoading && prefs && (
          <div className="mt-4 flex flex-col gap-3">
            {CHANNELS.map((channel) => (
              <div key={channel.key} className="flex items-center justify-between">
                <span className="text-small">{channel.label}</span>
                <Switch
                  checked={prefs[channel.key]}
                  onCheckedChange={(checked) => update.mutate({ [channel.key]: checked })}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
