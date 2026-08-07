import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/services/rate-limit.service";
import { createCommentSchema } from "@/lib/validation/comment.schemas";
import { createComment, CommentBlockedError } from "@/lib/services/comment-moderation.service";

const COMMENT_RATE_LIMIT = { maxCount: 10, windowSeconds: 60 * 60 };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS already returns exactly what's visible: approved comments for
  // everyone, plus the caller's own pending/rejected ones, plus everything
  // for staff.
  const { data: comments, error } = await supabase
    .from("lesson_comments")
    .select("*")
    .eq("lesson_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) return apiError("تعذر جلب التعليقات", null, 500);

  if (!comments?.length) return apiSuccess([], "تم جلب التعليقات");

  // lesson_comments.user_id and teachers.user_id are sibling FKs to
  // auth.users, not FKs to each other - resolved with a batched lookup.
  const admin = createAdminClient();
  const { data: teacherRows } = await admin
    .from("teachers")
    .select("user_id")
    .in(
      "user_id",
      comments.map((c) => c.user_id),
    );
  const teacherUserIds = new Set((teacherRows ?? []).map((t) => t.user_id));

  const withBadge = comments.map((comment) => ({
    ...comment,
    is_teacher: teacherUserIds.has(comment.user_id),
  }));

  return apiSuccess(withBadge, "تم جلب التعليقات");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const allowed = await checkRateLimit(`comment:${user.id}`, COMMENT_RATE_LIMIT.maxCount, COMMENT_RATE_LIMIT.windowSeconds);
  if (!allowed) return apiError("عدد التعليقات كتير قوي، حاول تاني بعد شوية", null, 429);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  try {
    const { comment } = await createComment({
      userId: user.id,
      lessonId: id,
      content: parsed.data.content,
      parentCommentId: parsed.data.parent_comment_id ?? null,
    });
    return apiSuccess(comment, "تم إرسال التعليق", 201);
  } catch (error) {
    if (error instanceof CommentBlockedError) return apiError(error.message, null, 403);
    throw error;
  }
}
