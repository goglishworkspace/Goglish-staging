import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { TeachersSection } from "@/components/landing/TeachersSection";
import { FeaturedVideoSection } from "@/components/landing/FeaturedVideoSection";
import { HonorBoardSection } from "@/components/landing/HonorBoardSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "الرئيسية",
  description: "ذاكر صح...وادخل الامتحان وانت واثق - منصة Goglish التعليمية لطلاب الثانوية العامة",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <HeroSection isLoggedIn={!!user} />
      <TeachersSection />
      <FeaturedVideoSection />
      <HonorBoardSection />
      <section id="faq" className="w-full bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
          <FaqSection />
          <CtaSection isLoggedIn={!!user} />
        </div>
      </section>
    </>
  );
}
