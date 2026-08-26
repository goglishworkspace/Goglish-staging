import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  description: "لوحة تحكم الطالب في Goglish",
};

export default function DashboardHomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
