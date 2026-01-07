"use client";

import { BarChart3, FileText, Home, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/dashboard", label: "분석", icon: BarChart3 },
  { href: "/holdings", label: "보유", icon: TrendingUp },
  { href: "/transactions", label: "거래", icon: FileText },
  { href: "/settings/stocks", label: "설정", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home";
    }
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-gray-200 lg:hidden">
      <div className="h-full grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors",
                active ? "text-primary" : "text-gray-500 hover:text-gray-700",
              )}
            >
              <Icon className="size-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
