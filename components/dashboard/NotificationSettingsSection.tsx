"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/lib/api/queries/notification-preferences";

const CHANNELS: {
  key: "push";
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "push",
    label: "إشعارات الموقع والتطبيق",
    desc: "تنبيهات فورية عند نزول كويزات، واجبات جديدة، وردود المعلمين على أسئلتك",
    icon: Bell,
  },
];

export function NotificationSettingsSection() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const onToggle = (channelKey: "email" | "sms" | "push" | "whatsapp", label: string, checked: boolean) => {
    setUpdatingKey(channelKey);
    update.mutate(
      { [channelKey]: checked },
      {
        onSuccess: () => {
          toast.success(checked ? `تم تفعيل إشعارات ${label}` : `تم إيقاف إشعارات ${label}`);
        },
        onError: () => {
          toast.error(`تعذر تحديث إعدادات ${label}`);
        },
        onSettled: () => {
          setUpdatingKey(null);
        },
      },
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div>
          <h2 className="flex items-center gap-2 text-h3 text-secondary dark:text-white">
            <Bell className="size-5 text-primary" />
            إعدادات الإشعارات والتنبيهات
          </h2>
          <p className="mt-1 text-small text-muted-foreground">
            تحكم في استلام التنبيهات الفورية وإشعارات الحصص داخل المنصة.
          </p>
        </div>

        {isLoading && <Skeleton className="mt-4 h-36 w-full rounded-xl" />}

        {!isLoading && prefs && (
          <div className="mt-4 flex flex-col divide-y divide-border/60">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const isPending = updatingKey === channel.key;

              return (
                <div key={channel.key} className="flex items-center justify-between py-3.5 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-foreground text-small block">{channel.label}</span>
                      <span className="text-caption text-muted-foreground block truncate">{channel.desc}</span>
                    </div>
                  </div>

                  <Switch
                    checked={prefs[channel.key]}
                    disabled={isPending}
                    onCheckedChange={(checked) => onToggle(channel.key, channel.label, checked)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

