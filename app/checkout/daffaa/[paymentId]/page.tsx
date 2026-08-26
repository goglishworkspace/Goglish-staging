"use client";

import { use, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Wallet, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { postJson } from "@/lib/api/client-fetch";
import type { ApiSuccess, ApiError } from "@/lib/api/response";

/** Shape of GET /api/getPaymentInfo?store_id= as actually observed live
 * against the goglish store (2026-08-22) - Daffaa's own docs only say
 * "wallets, currency, exchange rate" with no schema, so this is inferred
 * from the real response rather than official docs. Every field is
 * optional/nullable on purpose: an unconfigured store returns most of
 * these as "" or null (no wallets/InstaPay added yet), which the UI below
 * treats as "no payment method available" rather than rendering blanks. */
type DaffaaWalletInfo = {
  number?: string | null;
  SIM1?: string | null;
  SIM2?: string | null;
  instapay?: string | null;
  whatsapp?: string | null;
  instapay_info?: {
    username?: string | null;
    phone?: string | null;
    link?: string | null;
    address?: string | null;
  } | null;
  lines?: unknown[];
};

function isWalletInfo(info: unknown): info is DaffaaWalletInfo {
  return !!info && typeof info === "object";
}

/** Curated view of the store's payment destinations only - the raw API
 * response also carries currency/rate/fee bookkeeping fields (rate,
 * percentage, storecurrency, ...) that are Daffaa dashboard configuration,
 * not something a student paying in EGP needs to see. */
function WalletInfo({ info }: { info: unknown }) {
  if (!isWalletInfo(info)) return null;

  const wallets = [info.number, info.SIM1, info.SIM2].filter(
    (v): v is string => !!v && v.trim() !== "",
  );
  const instapayValues = [info.instapay, info.instapay_info?.phone, info.instapay_info?.username, info.instapay_info?.link].filter(
    (v): v is string => !!v && v.trim() !== "",
  );
  const hasLines = Array.isArray(info.lines) && info.lines.length > 0;
  const hasAnyDestination = wallets.length > 0 || instapayValues.length > 0 || hasLines;

  if (!hasAnyDestination) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-small text-destructive">
        <p>لسه مفيش وسيلة دفع متاحة على المتجر ده.</p>
        {info.whatsapp && (
          <p>
            تواصل معانا على واتساب <span dir="ltr">{info.whatsapp}</span> قبل ما تحاول تدفع.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 text-small">
      {wallets.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-muted-foreground">رقم المحفظة</p>
          {wallets.map((number) => (
            <p key={number} className="font-medium text-foreground" dir="ltr">
              {number}
            </p>
          ))}
        </div>
      )}
      {instapayValues.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-muted-foreground">إنستاباي</p>
          {instapayValues.map((value) => (
            <p key={value} className="font-medium text-foreground" dir="ltr">
              {value}
            </p>
          ))}
        </div>
      )}
      {info.whatsapp && (
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <MessageCircle className="size-3.5 shrink-0" />
          استفسارات: <span dir="ltr">{info.whatsapp}</span>
        </p>
      )}
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
