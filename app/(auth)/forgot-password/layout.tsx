import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نسيت الباسورد",
  description: "استرجع الوصول لحسابك في Goglish",
  openGraph: {
    title: "نسيت الباسورد | Goglish",
    description: "استرجع الوصول لحسابك في Goglish",
    siteName: "Goglish",
    locale: "ar_EG",
    type: "website",
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
