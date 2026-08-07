import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRefundSchema } from "@/lib/validation/refund.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { getPaymentProvider } from "@/lib/payments";

const REFUND_ROLES = ["admin", "super_admin", "support"];

/** Refunds are always admin-initiated (Section 9: "Refund يُعالَج من الأدمن") -
 * never a self-service student action. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, REFUND_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createRefundSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, order_id, provider, provider_payment_id, status, amount_cents")
    .eq("id", parsed.data.payment_id)
    .maybeSingle();
  if (paymentError) return apiError("تعذر جلب الدفعة", null, 500);
  if (!payment) return apiError("الدفعة غير موجودة", null, 404);
  if (payment.status !== "completed") {
    return apiError("لا يمكن استرجاع دفعة لم تكتمل", null, 409);
  }

  const amountCents = parsed.data.amount_cents ?? payment.amount_cents;
  const provider = getPaymentProvider(payment.provider);
  if (!provider) return apiError("طريقة الدفع دي مش متاحة", null, 400);
  const refundResult = await provider.refund({
    providerPaymentId: payment.provider_payment_id ?? "",
    amountCents,
  });

  const { data: refund, error: refundError } = await admin
    .from("refunds")
    .insert({
      payment_id: payment.id,
      order_id: payment.order_id,
      amount_cents: amountCents,
      reason: parsed.data.reason,
      status: refundResult.success ? "completed" : "failed",
      processed_by: user.id,
      completed_at: refundResult.success ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (refundError) return apiError("تعذر تسجيل الاسترجاع", null, 500);

  if (refundResult.success) {
    await admin.from("orders").update({ status: "refunded" }).eq("id", payment.order_id);

    // Revoke whatever access this order granted.
    await admin
      .from("course_entitlements")
      .update({ revoked_at: new Date().toISOString() })
      .eq("order_id", payment.order_id);
    await admin
      .from("user_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), auto_renew: false })
      .eq("order_id", payment.order_id);
  }

  return apiSuccess(refund, refundResult.success ? "تم الاسترجاع بنجاح" : "فشل الاسترجاع");
}
