import { useNotifications } from "@/lib/api/queries/notifications";
import { useModerationQueue } from "@/lib/api/queries/admin-comments";
import { useAllCourses, usePendingLessons } from "@/lib/api/queries/admin-content";
import type { ShellNavKey } from "./nav-registry";

/** Small counts shown next to a nav item's label (href -> count), e.g. how
 * many student comments a teacher hasn't looked at yet, or how many
 * courses/comments are waiting on an admin decision. Each underlying query
 * is only enabled for the role it's relevant to, so ShellSidebarNav can call
 * this unconditionally from every dashboard shell without firing requests
 * the current role isn't allowed to make. */
export function useNavBadges(navKey: ShellNavKey): Record<string, number> {
  const notifications = useNotifications({ enabled: navKey === "teacher" });
  const moderationQueue = useModerationQueue({ enabled: navKey === "admin" });
  const courses = useAllCourses({ enabled: navKey === "admin" });
  const pendingLessons = usePendingLessons({ enabled: navKey === "admin" });

  if (navKey === "teacher") {
    const unread = notifications.data?.filter((n) => !n.read_at).length ?? 0;
    return unread > 0 ? { "/teacher/notifications": unread } : {};
  }

  if (navKey === "admin") {
    const badges: Record<string, number> = {};
    const commentCount = moderationQueue.data?.length ?? 0;
    if (commentCount > 0) badges["/admin/comments"] = commentCount;

    const awaitingCourses = courses.data?.filter((c) => c.status === "draft" && c.submitted_at)?.length ?? 0;
    const awaitingLessons = pendingLessons.data?.length ?? 0;
    const approvalsCount = awaitingCourses + awaitingLessons;
    if (approvalsCount > 0) badges["/admin/courses"] = approvalsCount;

    return badges;
  }

  return {};
}
