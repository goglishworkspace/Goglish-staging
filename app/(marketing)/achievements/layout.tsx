import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الإنجازات والشارات",
  description: "شاراتك وسجل إنجازاتك على Goglish",
};

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
