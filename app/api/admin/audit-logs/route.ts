import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";

const VIEW_ROLES = ["admin", "super_admin", "support"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, VIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const actorUserId = request.nextUrl.searchParams.get("actor_user_id");
  const action = request.nextUrl.searchParams.get("action");
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (actorUserId) query = query.eq("actor_user_id", actorUserId);
  if (action) query = query.eq("action", action);

  const { data, error, count } = await query;
  if (error) return apiError("تعذر جلب سجل العمليات", null, 500);
  return apiSuccess({ logs: data, page, pageSize, total: count ?? 0 }, "تم جلب سجل العمليات");
}
