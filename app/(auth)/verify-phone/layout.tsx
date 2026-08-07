import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تفعيل رقم التليفون",
  description: "فعّل رقم تليفونك عشان تقدر تبدأ في Goglish",
  openGraph: {
    title: "تفعيل رقم التليفون | Goglish",
    description: "فعّل رقم تليفونك عشان تقدر تبدأ في Goglish",
    siteName: "Goglish",
    locale: "ar_EG",
    type: "website",
  },
};

export default function VerifyPhoneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
