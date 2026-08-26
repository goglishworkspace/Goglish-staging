import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المواد الدراسية",
  description: "تصفح كل المواد الدراسية المتاحة في Goglish حسب الصف",
};

export default function SubjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
