import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المدرسون",
  description: "كل المدرسين المتاحين على منصة Goglish",
};

export default function TeachersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
