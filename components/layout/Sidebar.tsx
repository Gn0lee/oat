"use client";

import { BarChart3, Briefcase, Home, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/dashboard", label: "분석", icon: BarChart3 },
  { href: "/assets", label: "자산", icon: Briefcase },
  { href: "/household", label: "가구", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="hidden lg:block w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
