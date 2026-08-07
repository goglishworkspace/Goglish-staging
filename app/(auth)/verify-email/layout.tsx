import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تأكيد الإيميل",
  description: "أكّد إيميلك عشان تقدر تبدأ في Goglish",
  openGraph: {
    title: "تأكيد الإيميل | Goglish",
    description: "أكّد إيميلك عشان تقدر تبدأ في Goglish",
    siteName: "Goglish",
    locale: "ar_EG",
    type: "website",
  },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
