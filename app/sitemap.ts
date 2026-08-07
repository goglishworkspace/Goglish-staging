import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Section 16/27 - SEO. Built from real published content, not a static
 * list - courses.slug isn't globally unique (Phase 2: unique per subject),
 * which matters once actual `/courses/[slug]` pages exist; harmless here
 * since no such page is built yet. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();
  const [{ data: courses }, { data: subjects }, { data: teachers }] = await Promise.all([
    admin.from("courses").select("slug, updated_at").eq("status", "published").is("deleted_at", null),
    admin.from("subjects").select("slug"),
    admin.from("teachers").select("id").eq("status", "active"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    // Phase 10 gamification/social-proof pages - public, crawlable, and
    // content-bearing (real rankings/achievements), unlike the role-gated
    // dashboards which robots.ts explicitly disallows.
    { url: `${SITE_URL}/leaderboard`, changeFrequency: "hourly", priority: 0.5 },
    { url: `${SITE_URL}/honor-board`, changeFrequency: "hourly", priority: 0.5 },
    { url: `${SITE_URL}/achievements`, changeFrequency: "daily", priority: 0.3 },
    { url: `${SITE_URL}/teachers`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const courseRoutes: MetadataRoute.Sitemap = (courses ?? []).map((course) => ({
    url: `${SITE_URL}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at as string) : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const subjectRoutes: MetadataRoute.Sitemap = (subjects ?? []).map((subject) => ({
    url: `${SITE_URL}/subjects/${subject.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const teacherRoutes: MetadataRoute.Sitemap = (teachers ?? []).map((teacher) => ({
    url: `${SITE_URL}/teachers/${teacher.id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...courseRoutes, ...subjectRoutes, ...teacherRoutes];
}
