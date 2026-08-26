import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { filterCommentContent } from "./comment-filter.service";
import { dispatchNotification } from "./notification-dispatch.service";
import { logAudit } from "./audit-log.service";

const SUSPENSION_HOURS = 24;

export class CommentBlockedError extends Error {}

const FILTER_REASON_MESSAGE: Record<string, string> = {
  phone_number: "التعليق فيه رقم تليفون",
  email: "التعليق فيه إيميل",
  link: "التعليق فيه رابط",
  profanity: "التعليق فيه كلام غير لائق",
};

/** Applies the 3-strike consequence (Section 11/38) after an auto-filter
 * rejection - never for a manual admin/moderator rejection. */
async function applyAutoRejectConsequence(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("comment_warning_count")
    .eq("id", userId)
    .single();
  const warningCount = (profile?.comment_warning_count ?? 0) + 1;

  const updates: Record<string, unknown> = { comment_warning_count: warningCount };
  if (warningCount === 2) {
    updates.comment_suspended_until = new Date(Date.now() + SUSPENSION_HOURS * 60 * 60 * 1000).toISOString();
  } else if (warningCount >= 3) {
    updates.comment_banned = true;
    updates.comment_ban_reason = "حظر تلقائي بعد 3 مخالفات لفلتر التعليقات";
  }
  await admin.from("profiles").update(updates).eq("id", userId);

  await dispatchNotification({
    userId,
    type: "comment_auto_rejected",
    title: "تحذير: تم رفض تعليقك تلقائياً",
    body:
      warningCount >= 3
        ? "تم حظرك بشكل دائم من كتابة التعليقات بعد 3 مخالفات."
        : warningCount === 2
          ? "تم إيقافك عن كتابة التعليقات لمدة 24 ساعة."
          : "تعليقك يخالف قواعد المنصة (أرقام/إيميلات/روابط/ألفاظ غير لائقة).",
    metadata: { warning_count: warningCount },
  });
}

/** Resolves who should be notified about a new comment/question on a lesson:
 * the course's creator plus anyone on its teaching team (course_teachers) -
 * same set can_manage_course_content() treats as "the teacher(s)", minus
 * staff roles (a moderator managing content isn't "the teacher" personally). */
async function resolveLessonTeacherUserIds(
  admin: ReturnType<typeof createAdminClient>,
  lessonId: string,
): Promise<string[]> {
  const { data: lesson } = await admin
    .from("lessons")
    .select("title, modules(course_id)")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return [];

  const modules = lesson.modules as { course_id: string }[] | { course_id: string } | null;
  const courseId = Array.isArray(modules) ? modules[0]?.course_id : modules?.course_id;
  if (!courseId) return [];

  const [{ data: course }, { data: courseTeachers }] = await Promise.all([
    admin.from("courses").select("created_by").eq("id", courseId).maybeSingle(),
    admin.from("course_teachers").select("teachers(user_id)").eq("course_id", courseId),
  ]);

  const userIds = new Set<string>();
  if (course?.created_by) userIds.add(course.created_by);
  for (const row of courseTeachers ?? []) {
    const teacher = row.teachers as { user_id: string } | { user_id: string }[] | null;
    const userId = Array.isArray(teacher) ? teacher[0]?.user_id : teacher?.user_id;
    if (userId) userIds.add(userId);
  }
  return Array.from(userIds);
}

async function notifyTeachersOfNewComment(
  admin: ReturnType<typeof createAdminClient>,
  params: { lessonId: string; commentId: string; authorUserId: string; isReply: boolean },
): Promise<void> {
  const { data: lesson } = await admin.from("lessons").select("title").eq("id", params.lessonId).maybeSingle();
  const teacherUserIds = await resolveLessonTeacherUserIds(admin, params.lessonId);

  await Promise.all(
    teacherUserIds
      .filter((userId) => userId !== params.authorUserId)
      .map((userId) =>
        dispatchNotification({
          userId,
          type: params.isReply ? "lesson_comment_reply" : "lesson_comment_new",
          title: params.isReply ? "رد جديد على تعليق في درسك" : "سؤال/تعليق جديد على درسك",
          body: `في انتظار المراجعة على درس "${lesson?.title ?? ""}"`,
          metadata: { lesson_id: params.lessonId, comment_id: params.commentId },
        }),
      ),
  );
}

export async function createComment(params: {
  userId: string;
  lessonId: string;
  content: string;
  parentCommentId: string | null;
}): Promise<{
  comment: { id: string; status: string; rejection_reason: string | null };
}> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("comment_banned, comment_suspended_until")
    .eq("id", params.userId)
    .single();
  if (profile?.comment_banned) {
    throw new CommentBlockedError("محظور من كتابة التعليقات");
  }
  if (profile?.comment_suspended_until && new Date(profile.comment_suspended_until) > new Date()) {
    throw new CommentBlockedError("موقوف مؤقتاً عن كتابة التعليقات");
  }

  if (params.parentCommentId) {
    const { data: parent } = await admin
      .from("lesson_comments")
      .select("id, status, deleted_at")
      .eq("id", params.parentCommentId)
      .maybeSingle();
    if (!parent || parent.deleted_at) {
      throw new CommentBlockedError("مينفعش الرد على تعليق مش معتمد");
    }
    // A student can only reply once a comment is approved (same rule as
    // before), but the lesson's own teacher/team is allowed to reply to a
    // still-pending comment - that's the whole point of them being able to
    // see it via lesson_comments_read in the first place (reaching a
    // student's question shouldn't have to wait on admin moderation first).
    if (parent.status !== "approved") {
      const teacherUserIds = await resolveLessonTeacherUserIds(admin, params.lessonId);
      if (!teacherUserIds.includes(params.userId)) {
        throw new CommentBlockedError("مينفعش الرد على تعليق مش معتمد");
      }
    }
  }

  const filterResult = filterCommentContent(params.content);

  const { data: comment, error } = await admin
    .from("lesson_comments")
    .insert({
      lesson_id: params.lessonId,
      user_id: params.userId,
      parent_comment_id: params.parentCommentId,
      content: params.content,
      status: filterResult.blocked ? "rejected" : "pending",
      auto_rejected: filterResult.blocked,
      rejection_reason: filterResult.blocked ? FILTER_REASON_MESSAGE[filterResult.reason!] : null,
    })
    .select("id, status, rejection_reason")
    .single();
  if (error) {
    // lesson_comments_one_per_user_per_lesson (top-level comments only) -
    // a student gets exactly one question/comment per lesson, same rule as
    // one review per course.
    if (error.code === "23505" && !params.parentCommentId) {
      throw new CommentBlockedError("متاح تعليق واحد بس لكل طالب على كل درس");
    }
    throw error;
  }

  if (filterResult.blocked) {
    await applyAutoRejectConsequence(admin, params.userId);
  } else {
    await notifyTeachersOfNewComment(admin, {
      lessonId: params.lessonId,
      commentId: comment.id,
      authorUserId: params.userId,
      isReply: !!params.parentCommentId,
    });
  }

  return { comment };
}

export async function reviewComment(params: {
  commentId: string;
  reviewerId: string;
  decision: "approved" | "rejected";
  rejectionReason: string | null;
}): Promise<{ id: string; status: string; rejection_reason: string | null } | null> {
  const admin = createAdminClient();

  const { data: comment, error } = await admin
    .from("lesson_comments")
    .update({
      status: params.decision,
      rejection_reason: params.decision === "rejected" ? params.rejectionReason : null,
      auto_rejected: false,
      reviewed_by: params.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.commentId)
    .select("id, status, rejection_reason, user_id")
    .maybeSingle();
  if (error) throw error;
  if (!comment) return null;

  await logAudit({
    actorUserId: params.reviewerId,
    action: params.decision === "approved" ? "comment.approved" : "comment.rejected",
    targetTable: "lesson_comments",
    targetId: comment.id,
    metadata: { rejection_reason: params.rejectionReason },
  });

  await dispatchNotification({
    userId: comment.user_id,
    type: params.decision === "approved" ? "comment_approved" : "comment_rejected",
    title: params.decision === "approved" ? "تم الموافقة على تعليقك" : "تم رفض تعليقك",
    body:
      params.decision === "approved"
        ? "تعليقك ظاهر دلوقتي تحت الدرس."
        : (params.rejectionReason ?? "تعليقك متوافقش مع قواعد المنصة."),
    metadata: { comment_id: comment.id },
  });

  return { id: comment.id, status: comment.status, rejection_reason: comment.rejection_reason };
}

export async function reportComment(params: {
  commentId: string;
  reporterUserId: string;
  reason: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("comment_reports")
    .insert({ comment_id: params.commentId, reporter_user_id: params.reporterUserId, reason: params.reason });
  if (error) throw error;
}
