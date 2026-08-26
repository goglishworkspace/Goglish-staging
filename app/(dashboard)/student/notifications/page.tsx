"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotifications,
  useMarkNotificationRead,
  useRespondToParentLinkRequest,
  notificationHref,
  type Notification,
} from "@/lib/api/queries/notifications";

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

function NotificationCard({ notification }: { notification: Notification }) {
  const isUnread = !notification.read_at;
  const linkId = notification.type === "parent_link_request" ? (notification.metadata?.link_id as string | undefined) : undefined;

  return (
    <Card className={isUnread ? "w-full border-primary/50 bg-primary/5" : "w-full"}>
      <CardContent className="flex items-start gap-3 p-4">
        {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
        <div className={isUnread ? "min-w-0 flex-1" : "ms-4 min-w-0 flex-1"}>
          <p className="text-small font-semibold text-foreground">{notification.title}</p>
          <p className="mt-0.5 text-small text-muted-foreground">{notification.body}</p>
          <p className="mt-1 text-caption text-muted-foreground">
            {new Date(notification.created_at).toLocaleString("ar-EG")}
          </p>
          {linkId && <ParentLinkRequestActions linkId={linkId} />}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const href = notificationHref(notification);

  const onOpen = () => {
    if (!notification.read_at) markRead.mutate(notification.id);
  };

  if (href) {
    return (
      <Link href={href} onClick={onOpen} className="block">
        <NotificationCard notification={notification} />
      </Link>
    );
  }

  // Parent-link requests need their buttons clickable, so they can't be
  // wrapped in the same disabled-after-read <button> as everything else -
  // just mark them read once the student actually resolves the request
  // (ParentLinkRequestActions' own mutation invalidates this list anyway).
  if (notification.type === "parent_link_request") {
    return <NotificationCard notification={notification} />;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!!notification.read_at}
      className="block w-full text-start disabled:cursor-default"
    >
      <NotificationCard notification={notification} />
    </button>
  );
}

export default function StudentNotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-h2 text-secondary dark:text-white">الإشعارات</h1>
      </div>

      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && !notifications?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">مفيش إشعارات لسه.</p>
      )}

      {!isLoading && !!notifications?.length && (
        <ul className="flex w-full flex-col gap-3">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationRow notification={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
