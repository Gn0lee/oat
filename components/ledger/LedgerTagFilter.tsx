"use client";

import { Hash, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";

interface LedgerTagFilterProps {
  tags: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onSelectedIdsChange: (next: string[]) => void;
}

export function LedgerTagFilter({
  tags,
  selectedIds,
  onSelectedIdsChange,
}: LedgerTagFilterProps) {
  const handleToggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onSelectedIdsChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onSelectedIdsChange([...selectedIds, tagId]);
    }
  };

  const handleClear = () => {
    onSelectedIdsChange([]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="태그 필터"
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-normal gap-1.5",
              selectedIds.length > 0 &&
                "border-primary bg-primary/5 text-primary",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>태그 필터</span>
            {selectedIds.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-4 min-w-4 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground font-semibold"
              >
                {selectedIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[200px] p-2 rounded-xl">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-gray-400 px-2 py-1">
              태그 필터링 (다중 선택 AND)
            </p>
            {tags.length === 0 ? (
              <p className="text-xs text-gray-500 px-2 py-3 text-center">
                사용 가능한 태그가 없습니다.
              </p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                {tags.map((tag) => {
                  const isSelected = selectedIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-xs rounded-lg font-medium flex items-center justify-between transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "hover:bg-accent text-gray-700 hover:text-gray-900",
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Hash className="size-3.5 shrink-0" />
                        <span className="truncate">#{tag.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          aria-label="필터 해제"
          className="h-8 rounded-lg px-2 text-xs font-normal text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="size-3.5" />
          <span>필터 해제</span>
        </Button>
      )}
    </div>
  );
}
