import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة الشرف",
  description: "أعلى الطلاب في مجموع كل المواد بإجمالي نقاط الخبرة",
};

export default function HonorBoardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
