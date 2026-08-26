import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/services/rate-limit.service";
import { daffaaVerify, daffaaIsPaid, daffaaIsTerminalFailure } from "@/lib/payments/daffaa-client";
import { recordWebhookEvent, fulfillPaymentEvent } from "@/lib/services/webhook-processing.service";

const CONFIRM_RATE_LIMIT = { maxCount: 10, windowSeconds: 10 * 60 };

const bodySchema = z.object({
  payment_id: z.string().min(1, "رقم الدفعة مطلوب"),
  transaction_id: z.string().trim().min(1, "رقم العملية مطلوب"),
});

/** The Daffaa checkout page (/checkout/daffaa/[paymentId]) calls this after
 * the student pastes back the reference their wallet app gave them for a
 * transfer they sent manually - Daffaa has no hosted checkout and no signed
 * webhook to us (see daffaa.provider.ts), so this is the only place a
 * Daffaa payment actually gets confirmed. Reuses the same
 * recordWebhookEvent/fulfillPaymentEvent path a real webhook would use, so
 * fulfilment stays idempotent and consistent with every other gateway. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const allowed = await checkRateLimit(`daffaa-confirm:${user.id}`, CONFIRM_RATE_LIMIT.maxCount, CONFIRM_RATE_LIMIT.windowSeconds);
  if (!allowed) return apiError("عدد المحاولات كتير قوي، حاول تاني بعد شوية", null, 429);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);

  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, order_id, status, orders!inner(user_id)")
    .eq("provider", "daffaa")
    .eq("provider_payment_id", parsed.data.payment_id)
    .maybeSingle();
  if (paymentError) return apiError("تعذر جلب الدفعة", null, 500);
  if (!payment) return apiError("الدفعة غير موجودة", null, 404);
  if ((payment.orders as unknown as { user_id: string }).user_id !== user.id) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }
  if (payment.status === "completed") {
    return apiSuccess({ confirmed: true }, "الدفع مؤكد بالفعل");
  }
  if (payment.status === "cancelled") {
    return apiError("محاولة الدفع دي اتلغت، ابدأ عملية شراء جديدة", null, 409);
  }

  let transaction;
  try {
    transaction = await daffaaVerify(parsed.data.transaction_id);
  } catch (error) {
    console.error("daffaa verify failed", error);
    return apiError("تعذر التحقق من العملية دلوقتي، حاول تاني كمان شوية", null, 502);
  }

  if (!transaction) {
    return apiError("مفيش عملية بالرقم ده لسه - اتأكد إنك بعت المبلغ صح وجرب تاني كمان شوية", null, 409);
  }

  const paid = daffaaIsPaid(transaction);
  const failed = daffaaIsTerminalFailure(transaction);
  if (!paid && !failed) {
    return apiError("العملية لسه بتتأكد - جرب تاني كمان شوية", null, 409);
  }

  const eventRow = await recordWebhookEvent({
    provider: "daffaa",
    eventId: transaction.transactionId,
    providerPaymentId: parsed.data.payment_id,
    status: paid ? "completed" : "failed",
    payload: transaction,
  });

  if (!eventRow.processed) {
    try {
      await fulfillPaymentEvent({
        eventRowId: eventRow.id,
        provider: "daffaa",
        providerPaymentId: parsed.data.payment_id,
        status: paid ? "completed" : "failed",
      });
    } catch (error) {
      console.error("daffaa fulfillPaymentEvent failed", error);
      return apiError("تم تأكيد الدفع بس حصلت مشكلة في تفعيل الوصول، هنراجعها بسرعة", null, 500);
    }
  }

  if (!paid) return apiError(`العملية اتلغت أو فشلت (${transaction.statusLabel})`, null, 409);
  return apiSuccess({ confirmed: true }, "تم تأكيد الدفع");
}
