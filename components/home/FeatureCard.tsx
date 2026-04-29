import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  hint?: string;
  href: string;
  colorScheme: "amber" | "blue" | "emerald" | "violet";
}

const colorMap = {
  amber: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    dot: "bg-amber-400",
  },
  blue: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    dot: "bg-blue-400",
  },
  emerald: {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    dot: "bg-emerald-400",
  },
  violet: {
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    dot: "bg-violet-400",
  },
};

export function FeatureCard({
  icon,
  title,
  description,
  hint,
  href,
  colorScheme,
}: FeatureCardProps) {
  const colors = colorMap[colorScheme];

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col justify-between rounded-2xl p-4 min-h-[140px]",
        "bg-white shadow-sm active:scale-[0.98] transition-transform",
      )}
    >
      <div>
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3",
            colors.iconBg,
          )}
        >
          {icon}
        </div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center justify-between mt-3">
        {hint ? (
          <span className="text-xs text-gray-500 truncate pr-1">{hint}</span>
        ) : (
          <span />
        )}
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>
    </Link>
  );
}
