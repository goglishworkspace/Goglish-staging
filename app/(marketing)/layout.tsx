import { cookies } from "next/headers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const isLoggedIn = allCookies.some(
    (c) => c.name.includes("-auth-token") && c.value.length > 10,
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar isLoggedIn={isLoggedIn} />
      <main className="w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
