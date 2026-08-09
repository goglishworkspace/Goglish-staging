import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { TeachersSection } from "@/components/landing/TeachersSection";
import { FeaturedVideoSection } from "@/components/landing/FeaturedVideoSection";
import { HonorBoardSection } from "@/components/landing/HonorBoardSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnDashboardPath } from "@/lib/auth/require-role";

export const metadata: Metadata = {
  title: "الرئيسية",
  description: "ذاكر صح...وادخل الامتحان وانت واثق - منصة Goglish التعليمية لطلاب الثانوية العامة",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A logged-in user landing on "/" (right after login, or by clicking the
  // logo/bookmark) goes straight to their own dashboard instead of the
  // marketing page meant for visitors.
  if (user) {
    redirect(await resolveOwnDashboardPath(supabase));
  }

  return (
    <>
      <HeroSection isLoggedIn={!!user} />
      <TeachersSection />
      <FeaturedVideoSection />
      <HonorBoardSection />
      <section className="w-full bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <CtaSection isLoggedIn={!!user} />
        </div>
      </section>
    </>
  );
}
