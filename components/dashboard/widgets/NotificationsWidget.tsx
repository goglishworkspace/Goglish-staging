import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import { useRespondToParentLinkRequest } from "@/lib/api/queries/notifications";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

type DashboardNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function ParentLinkRequestActions({ linkId }: { linkId: string }) {
  const respond = useRespondToParentLinkRequest();

  const onRespond = (status: "approved" | "rejected") => {
    respond.mutate(
      { linkId, status },
      {
        onSuccess: () => toast.success(status === "approved" ? "تم قبول الطلب" : "تم رفض الطلب"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الطلب")),
      },
    );
  };

  return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" disabled={respond.isPending} onClick={() => onRespond("approved")}>
        قبول
      </Button>
      <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => onRespond("rejected")}>
        رفض
      </Button>
    </div>
  );
}

export function NotificationsWidget({ dashboard }: { dashboard: StudentDashboard }) {
  const notifications = dashboard.recent_notifications as DashboardNotification[];

  return (
    <WidgetCard icon={Bell} title="آخر الإشعارات">
      {notifications.length ? (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => {
            const linkId = n.type === "parent_link_request" ? (n.metadata?.link_id as string | undefined) : undefined;
            return (
              <li key={n.id} className="flex items-start gap-2">
                {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                <div className={n.read_at ? "ms-4" : ""}>
                  <p className="text-small font-medium">{n.title}</p>
                  <p className="text-caption text-muted-foreground">{n.body}</p>
                  {linkId && <ParentLinkRequestActions linkId={linkId} />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <WidgetEmpty text="مفيش إشعارات جديدة" />
      )}
    </WidgetCard>
  );
}
