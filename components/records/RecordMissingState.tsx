"use client";

import { FileQuestion, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface RecordMissingStateProps {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  className?: string;
}

export function RecordMissingState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: RecordMissingStateProps) {
  return (
    <section
      className={cn(
        "flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100",
        className,
      )}
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <FileQuestion className="size-8" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 max-w-[280px] text-sm leading-6 text-gray-500">
        {description}
      </p>
      <Button asChild className="mt-6" variant="outline" size="sm">
        <Link href={actionHref}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {actionLabel}
        </Link>
      </Button>
    </section>
  );
}
