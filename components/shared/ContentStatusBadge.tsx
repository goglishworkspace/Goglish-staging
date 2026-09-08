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
  if (status === "published") {
    if (submittedAt) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="default">منشور</Badge>
          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-caption">
            تعديلات قيد المراجعة
          </Badge>
        </span>
      );
    }
    return <Badge variant="default">منشور</Badge>;
  }
  if (status === "rejected") return <Badge variant="destructive">مرفوض</Badge>;
  if (status === "draft" && submittedAt) return <Badge variant="outline">قيد المراجعة</Badge>;
  return <Badge variant="secondary">مسودة</Badge>;
}
