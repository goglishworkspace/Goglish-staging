"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSettings, useUpdateSettings } from "@/lib/api/queries/admin-settings";

const SECTION_LABELS: Record<string, string> = {
  general: "عام",
  branding: "الهوية البصرية",
  homepage: "محتوى الصفحة الرئيسية",
  email: "إعدادات الإيميل",
  sms: "إعدادات الـ SMS",
  whatsapp: "إعدادات الواتساب",
  storage: "مزود التخزين",
  bunny: "Bunny Stream",
  youtube: "YouTube API",
  comments_moderation: "إعدادات مراجعة التعليقات",
  exam: "إعدادات الامتحانات",
  leaderboard: "إعدادات لوحة الصدارة",
  notifications: "إعدادات الإشعارات",
};

function keyLabel(key: string) {
  return key.split(".")[1]?.replace(/_/g, " ") ?? key;
}

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  // Only edited keys live in local state - the displayed value for any key
  // is "override if present, else the server value" (no effect needed to
  // mirror query data into state, which react-hooks/set-state-in-effect
  // flags as a cascading-render risk).
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});

  const values = useMemo(() => {
    const base = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
    return { ...base, ...overrides };
  }, [settings, overrides]);

  const setValue = (key: string, value: unknown) => setOverrides((v) => ({ ...v, [key]: value }));

  const onSave = () => {
    const entries = Object.entries(overrides).map(([key, value]) => ({ key, value }));
    if (!entries.length) {
      toast.error("مفيش تغييرات لحفظها");
      return;
    }
    updateSettings.mutate(entries, {
      onSuccess: () => {
        toast.success("تم حفظ الإعدادات");
        setOverrides({});
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حفظ الإعدادات")),
    });
  };

  const grouped = new Map<string, string[]>();
  for (const key of Object.keys(values)) {
    const section = key.split(".")[0];
    grouped.set(section, [...(grouped.get(section) ?? []), key]);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">الإعدادات</h1>
        <Button disabled={isLoading || updateSettings.isPending} onClick={onSave}>
          حفظ التغييرات
        </Button>
      </div>

      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {!isLoading &&
        Array.from(grouped.entries()).map(([section, keys]) => (
          <Card key={section} className="w-full">
            <CardContent className="flex w-full flex-col gap-4 p-5">
              <h2 className="text-h3 text-secondary dark:text-white">{SECTION_LABELS[section] ?? section}</h2>
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                {keys.map((key) => {
                  const value = values[key];
                  if (typeof value === "boolean") {
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <Label htmlFor={key} className="capitalize">
                          {keyLabel(key)}
                        </Label>
                        <Switch id={key} checked={value} onCheckedChange={(checked) => setValue(key, checked)} />
                      </div>
                    );
                  }
                  if (typeof value === "object" && value !== null) {
                    return (
                      <div key={key} className="col-span-full flex flex-col gap-1.5">
                        <Label htmlFor={key} className="capitalize">
                          {keyLabel(key)}
                        </Label>
                        <Textarea
                          id={key}
                          value={JSON.stringify(value, null, 2)}
                          onChange={(e) => {
                            try {
                              setValue(key, JSON.parse(e.target.value));
                            } catch {
                              // invalid JSON mid-typing - ignored until it parses again
                            }
                          }}
                          rows={4}
                          className="font-mono text-caption"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label htmlFor={key} className="capitalize">
                        {keyLabel(key)}
                      </Label>
                      <Input
                        id={key}
                        type={typeof value === "number" ? "number" : "text"}
                        value={value === null ? "" : String(value)}
                        onChange={(e) => setValue(key, typeof value === "number" ? Number(e.target.value) : e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
