import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "اختار صفك الدراسي",
  description: "أكّد أو غيّر صفك الدراسي عشان نجهزلك المحتوى المناسب",
};

export default function ChooseGradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
