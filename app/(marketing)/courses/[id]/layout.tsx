import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الكورس",
  description: "تفاصيل الكورس، محتواه، وتقييمات الطلاب",
};

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
