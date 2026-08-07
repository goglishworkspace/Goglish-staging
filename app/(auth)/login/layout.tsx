import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل دخولك لمتابعة رحلتك التعليمية في Goglish",
  openGraph: {
    title: "تسجيل الدخول | Goglish",
    description: "سجّل دخولك لمتابعة رحلتك التعليمية في Goglish",
    siteName: "Goglish",
    locale: "ar_EG",
    type: "website",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
