import type { LucideIcon } from "lucide-react";
import { BookText, Home, Settings, Wallet } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/ledger", label: "가계부", icon: BookText },
  { href: "/assets", label: "자산", icon: Wallet },
  { href: "/settings", label: "설정", icon: Settings },
];
