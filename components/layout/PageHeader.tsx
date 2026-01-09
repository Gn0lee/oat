import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: PageHeaderProps) {
  const hasAction = !!action;

  return (
    <div
      className={
        hasAction ? "flex items-center justify-between" : "flex items-center"
      }
    >
      <div className="flex items-center gap-4">
        {backHref && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
