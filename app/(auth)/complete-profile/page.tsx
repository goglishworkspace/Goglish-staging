import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompleteProfileForm } from "./_components/CompleteProfileForm";

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If there's truly no active session on the server, redirect to login
  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, phone, grade, role_type")
    .eq("id", user.id)
    .maybeSingle();

  // If user already completed their profile, forward them to their dashboard
  if (profile?.phone && (profile.role_type === "parent" || profile.grade)) {
    redirect(profile.role_type === "parent" ? "/parent/dashboard" : "/student/dashboard");
  }

  const meta = user.user_metadata || {};
  const fullName = (meta.full_name || meta.name || "").trim();
  let firstName = profile?.first_name || "";
  let lastName = profile?.last_name || "";

  if (!firstName && fullName) {
    const parts = fullName.split(" ");
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ") || "";
  }

  return (
    <CompleteProfileForm
      initialFirstName={firstName}
      initialLastName={lastName}
      initialPhone={profile?.phone || ""}
    />
  );
}
