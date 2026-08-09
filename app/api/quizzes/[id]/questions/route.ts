import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createQuestionSchema } from "@/lib/validation/question.schemas";
import { buildAnswerRows } from "@/lib/services/question-authoring.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc("can_manage_question_parent", {
    p_quiz_id: id,
    p_exam_id: null,
  });

  // Authoring view (teacher/admin) sees the answer key and hint; everyone
  // else only sees option content, never is_correct/order_index/match_group/
  // hint (the hint is only ever revealed after a wrong answer, via the
  // per-question check route - never handed out upfront).
  const columns = canManage
    ? "id, type, prompt, points, order_index, hint, deletion_requested_at, answers(id, content, is_correct, order_index, side, match_group)"
    : "id, type, prompt, points, order_index, answers(id, content, side)";

  const { data, error } = await supabase
    .from("questions")
    .select(columns)
    .eq("quiz_id", id)
    .order("order_index");

  if (error) return apiError("تعذر جلب الأسئلة", null, 500);
  return apiSuccess(data, "تم جلب الأسئلة");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data: question, error: qError } = await supabase
    .from("questions")
    .insert({
      quiz_id: id,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      points: parsed.data.points ?? 1,
      order_index: parsed.data.order_index,
      hint: parsed.data.hint || null,
    })
    .select()
    .single();
  if (qError) return apiError("تعذر إنشاء السؤال (لازم تقدر تدير الكويز ده)", null, 403);

  const answerRows = buildAnswerRows(parsed.data);
  if (answerRows.length > 0) {
    const { error: aError } = await supabase
      .from("answers")
      .insert(answerRows.map((a) => ({ ...a, question_id: question.id })));
    if (aError) {
      await supabase.from("questions").delete().eq("id", question.id);
      return apiError("تعذر حفظ إجابات السؤال", null, 500);
    }
  }

  return apiSuccess({ ...question, answers: answerRows }, "تم إنشاء السؤال", 201);
}
