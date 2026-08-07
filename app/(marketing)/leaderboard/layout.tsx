import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة الصدارة",
  description: "ترتيب الطلاب حسب نقاط الخبرة، عالمياً وفي كل مادة",
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
