import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة الصدارة",
  description: "ترتيب الطلاب بإجمالي نقاط الخبرة، عالمياً أو داخل كل مادة على حدة",
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
