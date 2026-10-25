"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // Only highlight on an exact match (for overview links)
  exact?: boolean;
}

interface DashboardShellProps {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}

// Sidebar layout shared by the student, teacher and admin areas. The sidebar is
// desktop-only; on mobile the same links live in the Navbar hamburger menu.
export default function DashboardShell({ title, nav, children }: DashboardShellProps) {
  const { user } = useApp();
  const pathname = usePathname();

  return (
    <div className="container-custom flex gap-8 py-6 lg:py-8">
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-24">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          {user && (
            <div className="flex items-center gap-3 rounded-md border border-border p-3 mb-4">
              <Avatar name={user.name} src={user.avatar} size="w-9 h-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
              </div>
            </div>
          )}
          <nav aria-label={title} className="space-y-1">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
