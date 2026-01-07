import { BarChart3, MinusCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const actions = [
  {
    href: "/transactions/new?type=buy",
    label: "매수",
    icon: PlusCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    href: "/transactions/new?type=sell",
    label: "매도",
    icon: MinusCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    href: "/dashboard",
    label: "분석",
    icon: BarChart3,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">빠른 액션</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div
                className={cn(
                  "flex items-center justify-center size-12 rounded-full",
                  action.bgColor,
                )}
              >
                <Icon className={cn("size-6", action.color)} />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
