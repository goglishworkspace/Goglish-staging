"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useProfile } from "@/lib/api/queries/profile";
import { postJson } from "@/lib/api/client-fetch";

const NAV_LINKS = [
  { href: "#teachers", label: "المدرسون" },
  { href: "/leaderboard", label: "الصدارة" },
  { href: "/achievements", label: "الإنجازات" },
  { href: "/honor-board", label: "لوحة الشرف" },
  { href: "#faq", label: "الأسئلة الشائعة" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="تبديل الوضع الداكن"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Both icons render on the server; CSS (not JS branching on
          resolvedTheme, which is undefined during SSR) picks the right one -
          avoids a hydration mismatch without needing a mounted-gate effect. */}
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}

export function Navbar() {
  const router = useRouter();
  const { data: profile } = useProfile();

  const onLogout = async () => {
    const result = await postJson("/api/auth/logout", {});
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-lg font-bold text-secondary dark:text-white">
          Goglish
        </Link>

        <nav className="hidden items-center gap-3 whitespace-nowrap lg:flex lg:gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {profile ? (
            <>
              <Button variant="outline" nativeButton={false} render={<Link href="/profile" />}>
                {profile.first_name} {profile.last_name}
              </Button>
              <Button variant="ghost" size="icon" aria-label="تسجيل الخروج" onClick={onLogout}>
                <LogOut />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
                تسجيل الدخول
              </Button>
              <Button nativeButton={false} render={<Link href="/register" />}>
                إنشاء حساب
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="القائمة" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs">
              <SheetHeader>
                <SheetTitle>Goglish</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    nativeButton={false}
                    render={<Link href={link.href} />}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 p-4">
                {profile ? (
                  <>
                    <Button variant="outline" nativeButton={false} render={<Link href="/profile" />}>
                      {profile.first_name} {profile.last_name}
                    </Button>
                    <Button variant="ghost" onClick={onLogout}>
                      <LogOut />
                      تسجيل الخروج
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
                      تسجيل الدخول
                    </Button>
                    <Button nativeButton={false} render={<Link href="/register" />}>
                      إنشاء حساب
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
