import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "كورساتي | Goglish",
  description: "جميع الدورات والكورسات المشترك بها، تابع تقدمك وواصل التعلم",
};

export default function MyCoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
