"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAllCourses } from "@/lib/api/queries/admin-content";
import {
  useBundles,
  useCreateBundle,
  useUpdateBundle,
  useDeleteBundle,
  bundleCourseList,
  type Bundle,
} from "@/lib/api/queries/bundles";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function CoursePicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: Set<string>;
  onToggle: (courseId: string) => void;
}) {
  const { data: courses, isLoading } = useAllCourses();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="flex max-h-56 w-full flex-col gap-1 overflow-y-auto rounded-lg border border-input p-2">
      {!courses?.length && <p className="p-2 text-small text-muted-foreground">مفيش كورسات لسه.</p>}
      {courses?.map((course) => (
        <label
          key={course.id}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-small hover:bg-muted"
        >
          <input
            type="checkbox"
            checked={selectedIds.has(course.id)}
            onChange={() => onToggle(course.id)}
            className="size-4 shrink-0 accent-primary"
          />
          {course.title}
        </label>
      ))}
    </div>
  );
}

function BundleDialog({ bundle }: { bundle?: Bundle }) {
  const isEdit = !!bundle;
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(bundle?.title ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(bundle?.cover_image_url ?? "");
  const [priceEgp, setPriceEgp] = useState(bundle ? String(bundle.price_cents / 100) : "");
  const [courseIds, setCourseIds] = useState<Set<string>>(
    new Set(bundle ? bundleCourseList(bundle).map((c) => c.id) : []),
  );

  const onToggleCourse = (courseId: string) => {
    setCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("عنوان الباقة مطلوب");
      return;
    }
    const price = Number(priceEgp);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("السعر غير صالح");
      return;
    }
    if (!courseIds.size) {
      toast.error("لازم كورس واحد على الأقل في الباقة");
      return;
    }

    const course_ids = [...courseIds];

    if (isEdit) {
      updateBundle.mutate(
        {
          bundleId: bundle.id,
          input: {
            title: title.trim(),
            description: description.trim(),
            cover_image_url: coverImageUrl.trim(),
            price_cents: Math.round(price * 100),
            course_ids,
          },
        },
        {
          onSuccess: () => {
            toast.success("تم تحديث الباقة");
            setOpen(false);
          },
          onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الباقة")),
        },
      );
      return;
    }

    createBundle.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        cover_image_url: coverImageUrl.trim(),
        price_cents: Math.round(price * 100),
        course_ids,
      },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الباقة");
          setOpen(false);
          setTitle("");
          setDescription("");
          setCoverImageUrl("");
          setPriceEgp("");
          setCourseIds(new Set());
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الباقة")),
      },
    );
  };

  const isPending = createBundle.isPending || updateBundle.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} />}>
        {isEdit ? <Pencil /> : <Plus />}
        {isEdit ? "تعديل" : "باقة جديدة"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الباقة" : "إنشاء باقة"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-title">عنوان الباقة</Label>
            <Input id="bundle-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-description">الوصف (اختياري)</Label>
            <Textarea id="bundle-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-cover-image">رابط صورة الغلاف (اختياري)</Label>
            <Input
              id="bundle-cover-image"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-price">السعر (جنيه)</Label>
            <Input id="bundle-price" type="number" min="0" value={priceEgp} onChange={(e) => setPriceEgp(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>كورسات الباقة</Label>
            <CoursePicker selectedIds={courseIds} onToggle={onToggleCourse} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "حفظ" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBundlesPage() {
  const { data: bundles, isLoading } = useBundles();
  const updateBundle = useUpdateBundle();
  const deleteBundle = useDeleteBundle();

  const onToggleActive = (bundle: Bundle) => {
    updateBundle.mutate(
      { bundleId: bundle.id, input: { is_active: !bundle.is_active } },
      {
        onSuccess: () => toast.success(bundle.is_active ? "تم إيقاف الباقة" : "تم تفعيل الباقة"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الباقة")),
      },
    );
  };

  const onDelete = (bundleId: string) => {
    deleteBundle.mutate(bundleId, {
      onSuccess: () => toast.success("تم حذف الباقة"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الباقة")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">الباقات</h1>
        <BundleDialog />
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !bundles?.length && <p className="py-8 text-center text-small text-muted-foreground">مفيش باقات لسه.</p>}

      {!isLoading && !!bundles?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
              <TableHead>الكورسات</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundles.map((bundle) => (
              <TableRow key={bundle.id}>
                <TableCell className="font-medium">{bundle.title}</TableCell>
                <TableCell className="text-small text-muted-foreground">
                  {bundleCourseList(bundle).map((c) => c.title).join("، ") || "-"}
                </TableCell>
                <TableCell>{(bundle.price_cents / 100).toLocaleString("ar-EG")} {bundle.currency}</TableCell>
                <TableCell>
                  <Badge variant={bundle.is_active ? "default" : "destructive"}>
                    {bundle.is_active ? "فعّالة" : "متوقفة"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BundleDialog bundle={bundle} />
                    <Button size="sm" variant="outline" disabled={updateBundle.isPending} onClick={() => onToggleActive(bundle)}>
                      {bundle.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={deleteBundle.isPending} onClick={() => onDelete(bundle.id)}>
                      حذف
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
