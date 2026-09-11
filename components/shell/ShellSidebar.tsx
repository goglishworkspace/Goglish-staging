"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NAV_BY_KEY, type ShellNavKey } from "@/lib/nav/nav-registry";
import { useNavBadges } from "@/lib/nav/nav-badges";

export function ShellSidebarNav({
  navKey,
  onNavigate,
}: {
  navKey: ShellNavKey;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const navItems = NAV_BY_KEY[navKey];
  const badges = useNavBadges(navKey);

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        const count = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-secondary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
            {!!count && (
              <Badge variant={active ? "secondary" : "default"} className="ms-auto">
                {count}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same shape as components/dashboard/Sidebar.tsx, generalized so
 * (admin)/(teacher)/(parent) don't each need their own copy. Takes navKey
 * (a plain string) rather than the nav items array itself - the array
 * contains Lucide icon *components*, which cannot cross the Server->Client
 * Component prop boundary (their async layouts must stay server components
 * for the role-gate redirect), so resolution happens here, client-side.
 *
 * Breakpoint is `md` (768px), not `lg` - the Admin Dashboard is required to
 * work fully on tablet, not just desktop, so the full sidebar (not the
 * mobile drawer) must already be showing at tablet width. Kept in sync with
 * ShellTopbar's `md:hidden` on the hamburger button. */
export function ShellSidebar({
  navKey,
  homeHref,
  title,
}: {
  navKey: ShellNavKey;
  homeHref: string;
  title: string;
}) {
  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-e md:border-border lg:w-64">
      <div className="flex h-16 items-center px-4 lg:px-6">
        <Link href={homeHref} className="text-h3 text-secondary dark:text-white">
          {title}
        </Link>
      </div>
      <ShellSidebarNav navKey={navKey} />
    </aside>
  );
}
