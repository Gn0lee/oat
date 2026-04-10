import type { LucideIcon } from "lucide-react";
import { BookText, Home, Settings, Wallet } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 이 탭을 활성화하는 추가 경로 접두사 (예: /dashboard -> 자산 탭) */
  aliasPatterns?: string[];
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/home") {
    return pathname === "/home";
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  if (item.aliasPatterns) {
    return item.aliasPatterns.some(
      (alias) => pathname === alias || pathname.startsWith(`${alias}/`),
    );
  }
  return false;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/ledger", label: "가계부", icon: BookText },
  {
    href: "/assets",
    label: "자산",
    icon: Wallet,
    aliasPatterns: ["/dashboard"],
  },
  {
    href: "/settings",
    label: "설정",
    icon: Settings,
    aliasPatterns: ["/household"],
  },
];
