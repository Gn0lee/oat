import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
}: QuickActionCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 bg-primary/10 rounded-full">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{title}</p>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={href}>{actionLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
