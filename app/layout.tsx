import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { GlobalDeterrents } from "@/components/shared/GlobalDeterrents";

const cairo = Cairo({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Goglish",
    template: "%s | Goglish",
  },
  description: "منصة Goglish التعليمية لطلاب الثانوية العامة",
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "Goglish",
    title: "Goglish",
    description: "منصة Goglish التعليمية لطلاب الثانوية العامة",
  },
  twitter: {
    card: "summary_large_image",
    title: "Goglish",
    description: "منصة Goglish التعليمية لطلاب الثانوية العامة",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cn("h-full", "antialiased", cairo.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <GlobalDeterrents />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
