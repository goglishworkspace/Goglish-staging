import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const PASSWORD = "GoglishQA#2026";

const ROLE_NAMES = [
  "student",
  "parent",
  "teacher",
  "moderator",
  "support",
  "content_manager",
  "accountant",
  "admin",
  "super_admin",
] as const;

async function createConfirmedUser(email: string, roleName: string) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  const userId = created.user.id;

  const { error: regErr } = await admin.rpc("complete_registration", {
    p_user_id: userId,
    p_first_name: roleName,
    p_last_name: "تجريبي",
    p_phone: null,
    p_national_id_encrypted: "qa-placeholder-encrypted",
    p_national_id_masked: "29XXXXXXXXXXXX",
    p_birth_date: "2009-01-01",
  });
  if (regErr) throw regErr;

  if (roleName === "student") {
    await admin.from("profiles").update({ grade: "grade1" }).eq("id", userId);
  }

  if (roleName !== "student") {
    // complete_registration always assigns 'student' first - swap it for
    // every other role so each QA account has exactly the one role it's for.
    const { data: studentRole } = await admin.from("roles").select("id").eq("name", "student").single();
    await admin.from("role_user").delete().eq("user_id", userId).eq("role_id", studentRole!.id);

    const { data: role } = await admin.from("roles").select("id").eq("name", roleName).single();
    await admin.from("role_user").insert({ user_id: userId, role_id: role!.id });

    await admin.from("profiles").update({ role_type: roleName }).eq("id", userId);
  }

  return userId;
}

async function main() {
  const userIds: Record<string, string> = {};
  for (const role of ROLE_NAMES) {
    userIds[role] = await createConfirmedUser(`qa.${role}@goglish.test`, role);
  }

  const teacherId = userIds.teacher;
  const studentId = userIds.student;
  const parentId = userIds.parent;

  const { data: teacherRow, error: teacherRowErr } = await admin
    .from("teachers")
    .insert({ user_id: teacherId })
    .select()
    .single();
  if (teacherRowErr) throw teacherRowErr;
  await admin.from("teacher_profiles").update({ display_name: "مدرس تجريبي QA" }).eq("teacher_id", teacherRow.id);

  const { data: grade } = await admin.from("grades").select("id").eq("slug", "grade1").single();
  const { data: subject, error: subjectErr } = await admin
    .from("subjects")
    .insert({ grade_id: grade!.id, name: "مادة تجريبية QA", slug: `qa-subject-${Date.now()}` })
    .select()
    .single();
  if (subjectErr) throw subjectErr;

  const { data: course, error: courseErr } = await admin
    .from("courses")
    .insert({
      subject_id: subject.id,
      title: "كورس تجريبي QA",
      slug: `qa-course-${Date.now()}`,
      status: "published",
      created_by: teacherId,
    })
    .select()
    .single();
  if (courseErr) throw courseErr;

  await admin.from("course_teachers").insert({ course_id: course.id, teacher_id: teacherRow.id });

  const { data: module_, error: moduleErr } = await admin
    .from("modules")
    .insert({ course_id: course.id, title: "وحدة تجريبية", order_index: 0, teacher_id: teacherRow.id })
    .select()
    .single();
  if (moduleErr) throw moduleErr;

  const { data: lesson, error: lessonErr } = await admin
    .from("lessons")
    .insert({
      module_id: module_.id,
      title: "درس تجريبي QA",
      order_index: 0,
      teacher_id: teacherRow.id,
      status: "published",
      created_by: teacherId,
    })
    .select()
    .single();
  if (lessonErr) throw lessonErr;

  const { data: quiz, error: quizErr } = await admin
    .from("quizzes")
    .insert({ lesson_id: lesson.id, title: "تدريب QA", status: "published", created_by: teacherId })
    .select()
    .single();
  if (quizErr) throw quizErr;

  const { data: q1, error: q1Err } = await admin
    .from("questions")
    .insert({
      quiz_id: quiz.id,
      type: "mcq",
      prompt: "كام ناتج 2 + 2؟",
      order_index: 0,
      hint: "جرب تعد على صوابعك",
    })
    .select()
    .single();
  if (q1Err) throw q1Err;
  await admin.from("answers").insert([
    { question_id: q1.id, content: "3", is_correct: false, order_index: 0 },
    { question_id: q1.id, content: "4", is_correct: true, order_index: 1 },
    { question_id: q1.id, content: "5", is_correct: false, order_index: 2 },
  ]);

  const { data: q2, error: q2Err } = await admin
    .from("questions")
    .insert({
      quiz_id: quiz.id,
      type: "true_false",
      prompt: "القاهرة عاصمة مصر",
      order_index: 1,
      hint: "فكر في العاصمة الإدارية القديمة",
    })
    .select()
    .single();
  if (q2Err) throw q2Err;
  await admin.from("answers").insert([
    { question_id: q2.id, content: "صح", is_correct: true, order_index: 0 },
    { question_id: q2.id, content: "غلط", is_correct: false, order_index: 1 },
  ]);

  await admin.from("course_entitlements").insert({ user_id: studentId, course_id: course.id, source: "purchase" });

  await admin
    .from("parent_student_links")
    .insert({ parent_user_id: parentId, student_user_id: studentId, status: "approved" });

  console.log("DONE");
  console.log(
    ROLE_NAMES.map((r) => `${r.padEnd(16)} qa.${r}@goglish.test`).join("\n"),
  );
  console.log(`\nPassword (same for all): ${PASSWORD}`);
  console.log(`\ncourseId=${course.id} lessonId=${lesson.id} quizId=${quiz.id}`);
}

main().catch((err) => {
  console.error("SEED_FAILED", err);
  process.exit(1);
});
