"use client";

import { use, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { postJson } from "@/lib/api/client-fetch";
import type { ApiSuccess, ApiError } from "@/lib/api/response";

/** Renders whatever daffaaPaymentInfo() returned - the field names aren't
 * documented beyond "wallets, currency, exchange rate", so this stays
 * generic instead of assuming a specific shape that might not match. */
function WalletInfo({ info }: { info: unknown }) {
  if (!info || typeof info !== "object") return null;
  const entries = Object.entries(info as Record<string, unknown>);
  if (!entries.length) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-small">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-muted-foreground">{key}</span>
          <span className="font-medium text-foreground" dir="ltr">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DaffaaCheckoutContent({ paymentId }: { paymentId: string }) {
  const searchParams = useSearchParams();
  const [walletInfo, setWalletInfo] = useState<unknown>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [transactionId, setTransactionId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const amountCents = Number(searchParams.get("amount_cents") ?? "0");
  const currency = searchParams.get("currency") ?? "EGP";
  const successUrl = searchParams.get("success_url") ?? "/";
  const cancelUrl = searchParams.get("cancel_url") ?? "/";

  useEffect(() => {
    fetch("/api/payments/daffaa/wallet-info")
      .then((res) => res.json())
      .then((json: ApiSuccess<{ info: unknown }> | ApiError) => {
        if (json.success) setWalletInfo(json.data.info);
        else toast.error(json.message);
      })
      .catch(() => toast.error("تعذر تحميل بيانات الدفع"))
      .finally(() => setLoadingInfo(false));
  }, []);

  const onConfirm = async () => {
    if (!transactionId.trim()) {
      toast.error("اكتب رقم العملية اللي وصلك من تطبيق المحفظة");
      return;
    }
    setConfirming(true);
    try {
      const res = await postJson<{ confirmed: boolean }>("/api/payments/daffaa/confirm", {
        payment_id: paymentId,
        transaction_id: transactionId.trim(),
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      window.location.href = successUrl;
    } catch {
      toast.error("حصل خطأ غير متوقع، حاول تاني");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <Wallet className="size-8 text-primary" />
        <h1 className="text-h3 text-secondary dark:text-white">الدفع بمحفظة إلكترونية / إنستاباي</h1>
        <p className="text-h3 text-secondary dark:text-white">
          {(amountCents / 100).toLocaleString("ar-EG")} {currency}
        </p>
      </div>

      <p className="text-small text-muted-foreground">
        حوّل المبلغ اللي فوق لأحد المحافظ أو أرقام إنستاباي الموضحة تحت، وبعدين الصق رقم/مرجع العملية اللي هيوصلك في رسالة من تطبيق المحفظة عشان نأكد الدفع.
      </p>

      {loadingInfo ? <Skeleton className="h-24 w-full rounded-lg" /> : <WalletInfo info={walletInfo} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="daffaa-transaction-id">رقم/مرجع العملية</Label>
        <Input
          id="daffaa-transaction-id"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="مثال: TXN-123456"
          dir="ltr"
        />
      </div>

      <Button disabled={confirming} onClick={onConfirm}>
        {confirming ? "جاري التأكيد..." : "تأكيد الدفع"}
      </Button>

      <Button variant="outline" nativeButton={false} render={<Link href={cancelUrl} />}>
        إلغاء والرجوع
      </Button>
    </div>
  );
}

export default function DaffaaCheckoutPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = use(params);
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-12 h-64 w-full max-w-md rounded-lg" />}>
      <DaffaaCheckoutContent paymentId={paymentId} />
    </Suspense>
  );
}
