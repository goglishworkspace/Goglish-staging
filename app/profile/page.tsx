import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnAreaKey } from "@/lib/auth/require-role";

/** Thin, role-aware redirect stub - not a shared dashboard page. Marketing
 * chrome (Navbar, HeroSection) is public and doesn't know the viewer's role
 * client-side, so it links here for "go to your account" and this bounces
 * server-side to the caller's own /<role>/profile before anything renders. */
export default async function ProfileRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const area = await resolveOwnAreaKey(supabase);
  redirect(`/${area}/profile`);
}
