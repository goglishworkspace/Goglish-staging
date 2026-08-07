import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التقدم",
  description: "تابع تقدمك في كل الكورسات",
};

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
