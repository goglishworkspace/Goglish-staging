import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابك الآن وابدأ رحلتك مع Goglish",
  openGraph: {
    title: "إنشاء حساب | Goglish",
    description: "أنشئ حسابك الآن وابدأ رحلتك مع Goglish",
    siteName: "Goglish",
    locale: "ar_EG",
    type: "website",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
