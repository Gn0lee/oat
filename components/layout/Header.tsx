"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200">
      <div className="h-full px-4 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">oat</span>
        </Link>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
