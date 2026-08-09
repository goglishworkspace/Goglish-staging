"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useDeletionRequests,
  useReviewDeletionRequest,
  type DeletionRequest,
  type DeletionRequestEntityType,
} from "@/lib/api/queries/admin-deletion-requests";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

const ENTITY_LABELS: Record<DeletionRequestEntityType, string> = {
  module: "وحدة",
  lesson: "درس",
  quiz: "تدريب",
  exam: "امتحان",
  question: "سؤال",
  lesson_resource: "ملف PDF",
};

function DeletionRequestRow({ item }: { item: DeletionRequest }) {
  const reviewRequest = useReviewDeletionRequest();

  const onDecide = (decision: "approved" | "rejected") => {
    reviewRequest.mutate(
      { entity_type: item.entity_type, entity_id: item.entity_id, decision },
      {
        onSuccess: () => toast.success(decision === "approved" ? "تم تنفيذ الحذف" : "تم رفض طلب الحذف"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تنفيذ الإجراء")),
      },
    );
  };

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline">{ENTITY_LABELS[item.entity_type]}</Badge>
      </TableCell>
      <TableCell className="font-medium">{item.label}</TableCell>
      <TableCell className="text-muted-foreground">{item.context}</TableCell>
      <TableCell className="text-muted-foreground">{item.requested_by_name}</TableCell>
      <TableCell className="text-muted-foreground">{new Date(item.requested_at).toLocaleDateString("ar-EG")}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="destructive" disabled={reviewRequest.isPending} onClick={() => onDecide("approved")}>
            تأكيد الحذف
          </Button>
          <Button size="sm" variant="outline" disabled={reviewRequest.isPending} onClick={() => onDecide("rejected")}>
            رفض الطلب
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AdminDeletionRequestsPage() {
  const { data: requests, isLoading } = useDeletionRequests();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">طلبات الحذف</h1>
        {!!requests?.length && <p className="text-small text-muted-foreground">{requests.length} طلب في انتظار المراجعة</p>}
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && !requests?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">مفيش طلبات حذف حاليًا.</p>
      )}

      {!isLoading && !!requests?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>المكان</TableHead>
              <TableHead>طلب بواسطة</TableHead>
              <TableHead>تاريخ الطلب</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((item) => (
              <DeletionRequestRow key={`${item.entity_type}-${item.entity_id}`} item={item} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
