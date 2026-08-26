import { createAdminClient } from "@/lib/supabase/admin";
import { createLoggedInStudent } from "./phase2-fixtures";

async function grantRole(userId: string, roleName: string) {
  const admin = createAdminClient();
  const { data: role } = await admin.from("roles").select("id").eq("name", roleName).single();
  await admin.from("role_user").insert({ user_id: userId, role_id: role!.id });
}

export async function createLoggedInModerator() {
  const { client, userId } = await createLoggedInStudent();
  await grantRole(userId, "moderator");
  return { client, userId };
}

export async function createLoggedInParent() {
  const { client, userId } = await createLoggedInStudent();
  await grantRole(userId, "parent");
  return { client, userId };
}

export async function linkParentToStudent(parentUserId: string, studentUserId: string) {
  const admin = createAdminClient();
  await admin
    .from("parent_student_links")
    .insert({ parent_user_id: parentUserId, student_user_id: studentUserId, status: "approved" });
}
