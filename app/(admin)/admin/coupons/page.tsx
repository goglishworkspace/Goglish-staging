"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useCoupons,
  useCreateCoupon,
  useToggleCouponActive,
  useDeleteCoupon,
  type Coupon,
} from "@/lib/api/queries/admin-coupons";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

const DISCOUNT_TYPE_LABEL: Record<Coupon["discount_type"], string> = {
  percent: "نسبة مئوية",
  fixed: "مبلغ ثابت",
  free_course: "كورس مجاني",
  free_bundle: "باقة مجانية",
};

function CreateCouponDialog() {
  const createCoupon = useCreateCoupon();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<Coupon["discount_type"]>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("الكود مطلوب");
      return;
    }
    createCoupon.mutate(
      {
        code: code.trim(),
        discount_type: discountType,
        discount_value: discountValue ? Number(discountValue) : undefined,
        max_uses: maxUses ? Number(maxUses) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الكوبون");
          setOpen(false);
          setCode("");
          setDiscountValue("");
          setMaxUses("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الكوبون")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        كوبون جديد
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء كوبون</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-code">الكود</Label>
            <Input id="coupon-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-type">نوع الخصم</Label>
            <select
              id="coupon-type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as Coupon["discount_type"])}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {Object.entries(DISCOUNT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {(discountType === "percent" || discountType === "fixed") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-value">قيمة الخصم</Label>
              <Input id="coupon-value" type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-max-uses">أقصى عدد استخدام (اختياري)</Label>
            <Input id="coupon-max-uses" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createCoupon.isPending}>
              إنشاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCouponsPage() {
  const { data: coupons, isLoading } = useCoupons();
  const toggleActive = useToggleCouponActive();
  const deleteCoupon = useDeleteCoupon();

  const onToggle = (coupon: Coupon) => {
    toggleActive.mutate(
      { id: coupon.id, is_active: !coupon.is_active },
      {
        onSuccess: () => toast.success(coupon.is_active ? "تم إيقاف الكوبون" : "تم تفعيل الكوبون"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الكوبون")),
      },
    );
  };

  const onDelete = (couponId: string) => {
    deleteCoupon.mutate(couponId, {
      onSuccess: () => toast.success("تم حذف الكوبون"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الكوبون")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">الكوبونات</h1>
        <CreateCouponDialog />
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !coupons?.length && <p className="py-8 text-center text-small text-muted-foreground">مفيش كوبونات.</p>}

      {!isLoading && !!coupons?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>القيمة</TableHead>
              <TableHead>الاستخدام</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                <TableCell>{DISCOUNT_TYPE_LABEL[coupon.discount_type]}</TableCell>
                <TableCell>
                  {coupon.discount_type === "percent"
                    ? `${coupon.discount_value}%`
                    : coupon.discount_type === "fixed"
                      ? `${(coupon.discount_value / 100).toLocaleString("ar-EG")} ج.م`
                      : "-"}
                </TableCell>
                <TableCell>
                  {coupon.uses_count} / {coupon.max_uses ?? "∞"}
                </TableCell>
                <TableCell>
                  <Badge variant={coupon.is_active ? "default" : "destructive"}>{coupon.is_active ? "فعّال" : "متوقف"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={toggleActive.isPending} onClick={() => onToggle(coupon)}>
                      {coupon.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={deleteCoupon.isPending} onClick={() => onDelete(coupon.id)}>
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
