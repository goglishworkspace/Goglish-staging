import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { daffaaPaymentInfo } from "@/lib/payments/daffaa-client";

/** Powers the "where do I send the money" panel on /checkout/daffaa - store
 * wallets, currency, and the live exchange rate. Requires login (not the
 * store API key) since it's called from the browser. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  try {
    const info = await daffaaPaymentInfo();
    return apiSuccess({ info });
  } catch (error) {
    console.error("daffaa paymentInfo failed", error);
    return apiError("تعذر تحميل بيانات الدفع دلوقتي، حاول تاني كمان شوية", null, 502);
  }
}
