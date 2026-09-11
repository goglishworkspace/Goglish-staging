"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useProfile } from "@/lib/api/queries/profile";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { postJson } from "@/lib/api/client-fetch";
import { SidebarNav } from "./Sidebar";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="تبديل الوضع الداكن"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}

export function DashboardTopbar() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-1 lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="القائمة" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs p-0">
            <SheetHeader className="p-4">
              <SheetTitle>Goglish</SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {profile && (
          <Link
            href="/student/profile"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <AvatarImage
              src={profile.avatar_url}
              initials={profile.first_name.charAt(0)}
              alt={`${profile.first_name} ${profile.last_name}`}
              size={32}
            />
            <span className="hidden sm:inline">
              {profile.first_name} {profile.last_name}
            </span>
          </Link>
        )}
        <Button variant="ghost" size="icon" aria-label="تسجيل الخروج" onClick={onLogout}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
