import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { getLinkedChildren, linkChildToParent } from "@/lib/services/parent-portal.service";
import { linkChildByNationalIdSchema } from "@/lib/validation/parent-link.schemas";
import { checkRateLimit } from "@/lib/services/rate-limit.service";

// A successful match auto-grants a parent account access to a real student's
// private data (grades, subscription, watch time), so unlike most self-
// service endpoints this one is guessable-input-shaped - tight enough to
// block scanning without blocking a parent who just mistyped a digit.
const LINK_CHILD_RATE_LIMIT = { maxCount: 5, windowSeconds: 60 * 60 };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const children = await getLinkedChildren(user.id);
  return apiSuccess(children, "تم جلب الأبناء المرتبطين");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const allowed = await checkRateLimit(
    `link-child:${user.id}`,
    LINK_CHILD_RATE_LIMIT.maxCount,
    LINK_CHILD_RATE_LIMIT.windowSeconds,
  );
  if (!allowed) return apiError("عدد محاولات الربط كتير قوي، حاول تاني بعد شوية", null, 429);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = linkChildByNationalIdSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const identifier = parsed.data.phone || parsed.data.national_id || "";
  const result = await linkChildToParent(user.id, identifier);
  if (!result.ok) {
    const message =
      result.reason === "invalid_format"
        ? "رقم الهاتف أو الرقم القومي غير صالح"
        : "مفيش طالب مسجل بالبيانات دي";
    return apiError(message, null, 404);
  }

  const message = result.status === "approved" ? "تم ربط الطالب بحسابك" : "تم إرسال طلب الربط - في انتظار موافقة الطالب";
  return apiSuccess({ student_id: result.studentId, status: result.status }, message);
}
