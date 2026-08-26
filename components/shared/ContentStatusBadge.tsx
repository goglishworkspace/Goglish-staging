import { Badge } from "@/components/ui/badge";

/** Section 6 content workflow: draft -> (submitted_at set) awaiting review ->
 * published | rejected. Shared between Teacher Dashboard (own content) and
 * Admin Dashboard (approval queue) so both display the exact same states. */
export function ContentStatusBadge({
  status,
  submittedAt,
}: {
  status: string;
  submittedAt?: string | null;
}) {
  if (status === "published") return <Badge variant="default">منشور</Badge>;
  if (status === "rejected") return <Badge variant="destructive">مرفوض</Badge>;
  if (status === "draft" && submittedAt) return <Badge variant="outline">قيد المراجعة</Badge>;
  return <Badge variant="secondary">مسودة</Badge>;
}
