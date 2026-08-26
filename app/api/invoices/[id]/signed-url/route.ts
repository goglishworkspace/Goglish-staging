import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب الفاتورة", null, 500);
  if (!invoice) return apiError("الفاتورة غير موجودة", null, 404);

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("invoices")
    .createSignedUrl(invoice.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) return apiError("تعذر توليد رابط التحميل", null, 500);

  return apiSuccess(
    { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS },
    "تم توليد رابط التحميل",
  );
}
