import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إعادة تعيين الباسورد",
  description: "غيّر باسورد حسابك في Goglish",
  openGraph: {
    title: "إعادة تعيين الباسورد | Goglish",
    description: "غيّر باسورد حسابك في Goglish",
    siteName: "Goglish",
    locale: "ar_EG",
    type: "website",
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
