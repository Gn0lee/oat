"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export interface Segment {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface SegmentedBarProps {
  segments: Segment[];
  className?: string;
  showLabels?: boolean;
}

export function SegmentedBar({
  segments,
  className,
  showLabels = true,
}: SegmentedBarProps) {
  // 비중이 높은 순으로 정렬 (시각적 일관성)
  const sortedSegments = [...segments].sort(
    (a, b) => b.percentage - a.percentage,
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 ring-2 ring-white shadow-inner">
        {sortedSegments.map((segment) => (
          <TooltipProvider key={segment.label} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="px-2 py-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <div
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="font-medium">{segment.label}</span>
                  <span className="font-bold opacity-80">
                    {segment.percentage.toFixed(1)}%
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {sortedSegments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-1.5">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-[11px] font-medium text-gray-500">
                {segment.label}
              </span>
              <span className="text-[11px] font-bold text-gray-900">
                {segment.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
