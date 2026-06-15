"use client";

import type { LucideIcon } from "lucide-react";
import { EntryRow } from "@/components/layout/screen";

interface SettingsMenuItemProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SettingsMenuItem({
  icon: Icon,
  label,
  description,
  href,
  onClick,
  disabled = false,
  isLoading = false,
}: SettingsMenuItemProps) {
  return (
    <EntryRow
      icon={Icon}
      title={label}
      description={description}
      href={href}
      onClick={onClick}
      disabled={disabled}
      isLoading={isLoading}
      trailing={
        disabled ? (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-400">
            준비 중
          </span>
        ) : undefined
      }
      className="rounded-xl bg-white"
    />
  );
}
