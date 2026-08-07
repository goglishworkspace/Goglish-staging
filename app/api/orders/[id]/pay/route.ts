import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { payOrderSchema } from "@/lib/validation/order.schemas";
import { getPaymentProvider } from "@/lib/payments";
import { MAX_PAYMENT_ATTEMPTS } from "@/lib/services/payment-state-machine.service";
import { checkRateLimit } from "@/lib/services/rate-limit.service";

const PAYMENT_RATE_LIMIT = { maxCount: 3, windowSeconds: 10 * 60 };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  // Section 22 - "Payment: 3 محاولات / 10 دقائق / مستخدم" - user-keyed, not
  // IP-keyed like proxy.ts's generic per-route limits, so it's checked here
  // rather than in the middleware (same pattern as the lesson-comment limit).
  const allowed = await checkRateLimit(`payment:${user.id}`, PAYMENT_RATE_LIMIT.maxCount, PAYMENT_RATE_LIMIT.windowSeconds);
  if (!allowed) return apiError("عدد محاولات الدفع كتير قوي، حاول تاني بعد شوية", null, 429);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, total_cents, currency, item_type, item_id")
    .eq("id", id)
    .maybeSingle();
  if (orderError) return apiError("تعذر جلب الطلب", null, 500);
  if (!order) return apiError("الطلب غير موجود", null, 404);
  if (order.user_id !== user.id) return apiError("مش مسموح لك بالإجراء ده", null, 403);
  if (order.status !== "pending") return apiError("الطلب ده مش قابل للدفع", null, 409);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = payOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { count: attemptCount } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  const attemptNumber = (attemptCount ?? 0) + 1;
  if (attemptNumber > MAX_PAYMENT_ATTEMPTS) {
    return apiError("تجاوزت الحد الأقصى من محاولات الدفع لهذا الطلب", null, 403);
  }

  const idempotencyKey = crypto.randomUUID();
  const origin = request.nextUrl.origin;
  const provider = getPaymentProvider(parsed.data.provider);
  if (!provider) return apiError("طريقة الدفع دي مش متاحة", null, 400);

  // Land the student back on the thing they bought, not the homepage - only
  // "course" has a dedicated page today; bundles/subscriptions fall back.
  const successUrl =
    order.item_type === "course"
      ? `${origin}/courses/${order.item_id}?status=success`
      : `${origin}/?order=${order.id}&status=success`;

  let checkout;
  try {
    checkout = await provider.createCheckout({
      orderId: order.id,
      amountCents: order.total_cents,
      currency: order.currency,
      idempotencyKey,
      successUrl,
      cancelUrl: `${origin}/?order=${order.id}&status=cancelled`,
      customerEmail: user.email ?? "",
    });
  } catch (error) {
    // A provider call can throw (bad credentials, network failure, gateway
    // rejection) - without this, the exception would escape the route
    // handler as a raw non-JSON 500, which client-fetch.ts's postJson can't
    // parse as an ApiError, leaving the caller's loading state stuck forever.
    console.error(`payment provider "${parsed.data.provider}" createCheckout failed for order ${order.id}`, error);
    return apiError("تعذر بدء عملية الدفع، حاول تاني كمان شوية", null, 502);
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      provider: parsed.data.provider,
      provider_payment_id: checkout.providerPaymentId,
      idempotency_key: idempotencyKey,
      attempt_number: attemptNumber,
      status: "processing",
      amount_cents: order.total_cents,
      currency: order.currency,
    })
    .select("id")
    .single();
  if (paymentError) return apiError("تعذر إنشاء محاولة الدفع", null, 500);

  return apiSuccess(
    { payment_id: payment.id, checkout_url: checkout.checkoutUrl },
    "تم إنشاء رابط الدفع",
    201,
  );
}
