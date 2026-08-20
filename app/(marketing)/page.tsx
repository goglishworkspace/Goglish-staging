import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { TeachersSection } from "@/components/landing/TeachersSection";
import { FeaturedVideoSection } from "@/components/landing/FeaturedVideoSection";
import { HonorBoardSection } from "@/components/landing/HonorBoardSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { JsonLd } from "@/components/shared/JsonLd";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnDashboardPath } from "@/lib/auth/require-role";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// "absolute" bypasses the root layout's "%s | Goglish" template - someone
// searching the brand name itself should see the full name plus what the
// platform actually is right in the result, not "الرئيسية | Goglish" (a
// title that only makes sense once you're already on the site).
export const metadata: Metadata = {
  title: { absolute: "Goglish - منصة Goglish التعليمية لطلاب الثانوية العامة" },
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
      {/* Organization + WebSite schema - the main lever for how "Goglish"
          itself (not a specific course/teacher page) shows up for a brand-
          name search: helps Google associate the name with this exact site
          and its real social profiles, and is a prerequisite for any future
          Knowledge Panel / sitelinks treatment. No sitelinks-searchbox
          action here on purpose - that requires a public search URL Google
          can actually query, and the only search page today is behind
          /student/ (auth-gated, disallowed in robots.txt). */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Goglish",
              url: SITE_URL,
              sameAs: [
                "https://www.youtube.com/@goglish-tv",
                "https://www.tiktok.com/@goglish0",
                "https://www.facebook.com/profile.php?id=61591573683214",
                "https://www.instagram.com/goglish_official",
              ],
            },
            {
              "@type": "WebSite",
              name: "Goglish",
              url: SITE_URL,
              inLanguage: "ar",
            },
          ],
        }}
      />
      <HeroSection isLoggedIn={!!user} />
      <TeachersSection />
      <FeaturedVideoSection />
      <HonorBoardSection />
      <section className="w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <CtaSection isLoggedIn={!!user} />
        </div>
      </section>
    </>
  );
}
