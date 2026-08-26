import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Phase 12 - the private role-gated dashboards (Phase 11) have no
        // SEO value and would otherwise leak their existence/structure to
        // crawlers; auth pages are similarly not worth indexing.
        disallow: [
          "/api/",
          "/checkout/mock/",
          "/admin/",
          "/teacher/",
          "/parent/",
          "/student/",
          "/profile",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/verify-phone",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
