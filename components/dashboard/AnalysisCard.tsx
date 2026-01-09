"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface AnalysisCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  color: string;
  bgColor: string;
  disabled?: boolean;
}

export function AnalysisCard({
  icon: Icon,
  label,
  description,
  href,
  color,
  bgColor,
  disabled = false,
}: AnalysisCardProps) {
  if (disabled) {
    const handleClick = () => {
      toast.info(`${label} 분석은 준비 중이에요`, {
        description: "조금만 기다려주세요!",
      });
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow opacity-80 hover:opacity-100"
      >
        <div className={cn("p-2.5 rounded-xl w-fit mb-3", bgColor)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={cn("p-2.5 rounded-xl w-fit mb-3", bgColor)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}
