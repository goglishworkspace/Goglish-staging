import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import { createLoggedInModerator } from "./phase6-fixtures";

describe("Lesson comments - creation and auto-filter", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("a clean comment goes to pending", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const { status, json } = await client.post<{ id: string; status: string }>(
      `/api/lessons/${lessonId}/comments`,
      { content: "الدرس ده كان مفيد جداً، شكراً" },
    );
    expect(status).toBe(201);
    expect(json?.data?.status).toBe("pending");
  });

  it("a comment with a phone number is auto-rejected immediately and bumps the warning count", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const { status, json } = await client.post<{ status: string; rejection_reason: string }>(
      `/api/lessons/${lessonId}/comments`,
      { content: "كلمني على 01012345678 لو محتاج شرح زيادة" },
    );
    expect(status).toBe(201);
    expect(json?.data?.status).toBe("rejected");
    expect(json?.data?.rejection_reason).toBeTruthy();

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("comment_warning_count")
      .eq("id", userId)
      .single();
    expect(profile?.comment_warning_count).toBe(1);
  });

  it("rejects a comment containing an email or a link", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const emailRes = await client.post<{ status: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تواصل معايا على test@example.com",
    });
    expect(emailRes.json?.data?.status).toBe("rejected");

    const { client: client2, userId: userId2 } = await createLoggedInStudent();
    registry.track(userId2);
    const linkRes = await client2.post<{ status: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "شوف الموقع ده https://example.com/spam",
    });
    expect(linkRes.json?.data?.status).toBe("rejected");
  });

  it("progresses through the 3-strike system: suspend 24h after strike 2, permanent ban after strike 3", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    const supabase = createAdminClient();

    // Strike 1.
    await client.post(`/api/lessons/${lessonId}/comments`, { content: "رقمي 01000000001" });
    let { data: profile } = await supabase
      .from("profiles")
      .select("comment_warning_count, comment_suspended_until, comment_banned")
      .eq("id", userId)
      .single();
    expect(profile?.comment_warning_count).toBe(1);
    expect(profile?.comment_suspended_until).toBeNull();

    // Strike 2 -> 24h suspension.
    await client.post(`/api/lessons/${lessonId}/comments`, { content: "رقمي 01000000002" });
    ({ data: profile } = await supabase
      .from("profiles")
      .select("comment_warning_count, comment_suspended_until, comment_banned")
      .eq("id", userId)
      .single());
    expect(profile?.comment_warning_count).toBe(2);
    expect(profile?.comment_suspended_until).toBeTruthy();
    expect(profile?.comment_banned).toBe(false);

    // While suspended, even a clean comment is blocked.
    const blockedRes = await client.post(`/api/lessons/${lessonId}/comments`, { content: "تعليق نضيف تماماً" });
    expect(blockedRes.status).toBe(403);

    // Simulate the 24h passing.
    await supabase
      .from("profiles")
      .update({ comment_suspended_until: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", userId);

    // Strike 3 -> permanent ban.
    await client.post(`/api/lessons/${lessonId}/comments`, { content: "رقمي 01000000003" });
    ({ data: profile } = await supabase
      .from("profiles")
      .select("comment_warning_count, comment_banned")
      .eq("id", userId)
      .single());
    expect(profile?.comment_warning_count).toBe(3);
    expect(profile?.comment_banned).toBe(true);

    const bannedRes = await client.post(`/api/lessons/${lessonId}/comments`, { content: "تعليق نضيف تماناً كمان" });
    expect(bannedRes.status).toBe(403);
  });

  it("rejects a reply to a non-approved comment, accepts a reply to an approved one", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: author, userId: authorId } = await createLoggedInStudent();
    registry.track(authorId);
    const { client: replier, userId: replierId } = await createLoggedInStudent();
    registry.track(replierId);

    const { json: parentJson } = await author.post<{ id: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تعليق أساسي",
    });
    const parentId = parentJson!.data!.id;

    const replyBeforeApproval = await replier.post(`/api/lessons/${lessonId}/comments`, {
      content: "رد على تعليق لسه معتمدش",
      parent_comment_id: parentId,
    });
    expect(replyBeforeApproval.status).toBe(403);

    const { client: moderator } = await createLoggedInModerator();
    await moderator.post(`/api/comments/${parentId}/review`, { decision: "approved" });

    const replyAfterApproval = await replier.post<{ status: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "رد على تعليق معتمد",
      parent_comment_id: parentId,
    });
    expect(replyAfterApproval.status).toBe(201);
    expect(replyAfterApproval.json?.data?.status).toBe("pending");
  });

  it("shows the teacher badge on a teacher's own comment", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    await teacher.client.post(`/api/lessons/${lessonId}/comments`, { content: "ملاحظة من المدرس" });

    const { json } = await teacher.client.get<Array<{ user_id: string; is_teacher: boolean }>>(
      `/api/lessons/${lessonId}/comments`,
    );
    const own = json!.data!.find((c) => c.user_id === teacher.userId);
    expect(own?.is_teacher).toBe(true);
  });
});

describe("Comment moderation queue and review", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("orders teacher comments first in the moderation queue, and lets a moderator approve/reject", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);
    const { client: moderator, userId: moderatorId } = await createLoggedInModerator();
    registry.track(moderatorId);

    await student.post(`/api/lessons/${lessonId}/comments`, { content: "تعليق طالب عادي" });
    await teacher.client.post(`/api/lessons/${lessonId}/comments`, { content: "تعليق المدرس" });

    const studentDenied = await student.get("/api/comments/moderation-queue");
    expect(studentDenied.status).toBe(403);

    const { status, json } = await moderator.get<Array<{ id: string; user_id: string; is_teacher: boolean }>>(
      "/api/comments/moderation-queue",
    );
    expect(status).toBe(200);
    const queue = json!.data!.filter((c) => [studentId, teacher.userId].includes(c.user_id));
    expect(queue[0].is_teacher).toBe(true);

    const teacherComment = queue.find((c) => c.is_teacher)!;
    const { json: reviewJson } = await moderator.post<{ status: string }>(
      `/api/comments/${teacherComment.id}/review`,
      { decision: "approved" },
    );
    expect(reviewJson?.data?.status).toBe("approved");

    const supabase = createAdminClient();
    const { data: notifications } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", teacher.userId)
      .eq("type", "comment_approved");
    expect(notifications?.length).toBe(1);
  });

  it("records a manual admin rejection without touching the auto-filter warning count", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    const { client: moderator, userId: moderatorId } = await createLoggedInModerator();
    registry.track(moderatorId);

    const { json: commentJson } = await client.post<{ id: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تعليق خارج عن الموضوع تماماً",
    });

    await moderator.post(`/api/comments/${commentJson!.data!.id}/review`, {
      decision: "rejected",
      rejection_reason: "خارج عن الموضوع",
    });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("comment_warning_count")
      .eq("id", userId)
      .single();
    expect(profile?.comment_warning_count).toBe(0);

    const { data: comment } = await supabase
      .from("lesson_comments")
      .select("status, auto_rejected, rejection_reason")
      .eq("id", commentJson!.data!.id)
      .single();
    expect(comment?.status).toBe("rejected");
    expect(comment?.auto_rejected).toBe(false);
    expect(comment?.rejection_reason).toBe("خارج عن الموضوع");
  });
});

describe("Report and delete comments", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("lets anyone report a comment once, and rejects a duplicate report", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: author, userId: authorId } = await createLoggedInStudent();
    registry.track(authorId);
    const { client: reporter, userId: reporterId } = await createLoggedInStudent();
    registry.track(reporterId);

    const { json: commentJson } = await author.post<{ id: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تعليق للإبلاغ عنه",
    });
    const commentId = commentJson!.data!.id;

    const firstReport = await reporter.post(`/api/comments/${commentId}/report`, { reason: "غير لائق" });
    expect(firstReport.status).toBe(200);

    const duplicateReport = await reporter.post(`/api/comments/${commentId}/report`, { reason: "غير لائق" });
    expect(duplicateReport.status).toBe(400);

    const supabase = createAdminClient();
    const { data: comment } = await supabase
      .from("lesson_comments")
      .select("report_count")
      .eq("id", commentId)
      .single();
    expect(comment?.report_count).toBe(1);
  });

  it("lets the author delete their own comment, blocks others, and lets an admin delete any comment", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: author, userId: authorId } = await createLoggedInStudent();
    registry.track(authorId);
    const { client: other, userId: otherId } = await createLoggedInStudent();
    registry.track(otherId);

    const { json: commentJson } = await author.post<{ id: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تعليق هيتحذف",
    });
    const commentId = commentJson!.data!.id;

    const deniedDelete = await other.delete(`/api/comments/${commentId}`);
    expect(deniedDelete.status).toBe(404);

    const ownDelete = await author.delete(`/api/comments/${commentId}`);
    expect(ownDelete.status).toBe(200);

    const { json: commentJson2 } = await author.post<{ id: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تعليق تاني هيتحذف من الأدمن",
    });
    const commentId2 = commentJson2!.data!.id;

    const otherDeleteAttempt = await other.delete(`/api/comments/${commentId2}`);
    expect(otherDeleteAttempt.status).toBe(404);

    const adminDelete = await admin.client.delete(`/api/comments/${commentId2}`);
    expect(adminDelete.status).toBe(200);
  });
});
