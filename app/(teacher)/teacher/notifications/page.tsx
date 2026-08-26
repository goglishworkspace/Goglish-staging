"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotifications,
  useMarkNotificationRead,
  notificationHref,
  type Notification,
} from "@/lib/api/queries/notifications";

function NotificationCard({ notification }: { notification: Notification }) {
  const isUnread = !notification.read_at;

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

export default function TeacherNotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-h2 text-secondary dark:text-white">الإشعارات</h1>
        <p className="mt-1 text-small text-muted-foreground">
          تعليقات وأسئلة الطلبة على دروسك بتظهر هنا - دوس على أي واحد عشان توصل للتعليق وترد عليه.
        </p>
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
