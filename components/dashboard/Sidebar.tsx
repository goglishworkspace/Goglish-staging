"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/lib/api/queries/notifications";
import { DASHBOARD_NAV_ITEMS } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <nav className="flex flex-col gap-1 p-4">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        const count = item.href === "/student/notifications" ? unreadCount : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-secondary"
                : "text-foreground/80 hover:bg-muted hover:text-foreground",
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

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-e lg:border-border">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="text-h3 text-secondary dark:text-white">
          Goglish
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
