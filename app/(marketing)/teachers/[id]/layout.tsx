import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المدرس",
  description: "ملف المدرس، كورساته، وتقييمات الطلاب",
};

export default function TeacherProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
