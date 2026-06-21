"use client";

import { Hash, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  normalizeLedgerTagName,
  validateLedgerTagName,
} from "@/lib/api/ledger-tags";

interface LedgerTagInputProps {
  value: string[];
  onValueChange: (next: string[]) => void;
  availableTags: Array<{ id: string; name: string }>;
  maxTags?: number;
  error?: string;
  placeholder?: string;
}

export function LedgerTagInput({
  value,
  onValueChange,
  availableTags,
  maxTags = 5,
  error: externalError,
  placeholder = "#태그 입력",
}: LedgerTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAddTag = (tagName: string) => {
    setLocalError(null);
    const normalized = normalizeLedgerTagName(tagName);

    if (!normalized) return;

    try {
      validateLedgerTagName(normalized);
    } catch (e) {
      const err = e as Error;
      setLocalError(err.message || "올바르지 않은 태그 이름입니다.");
      return;
    }

    if (value.length >= maxTags) {
      setLocalError(`최대 ${maxTags}개까지만 추가할 수 있습니다.`);
      return;
    }

    // 중복 제거 (대소문자 무관하게 비교)
    if (value.some((v) => v.toLowerCase() === normalized.toLowerCase())) {
      setInputValue("");
      return;
    }

    onValueChange([...value, normalized]);
    setInputValue("");
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setLocalError(null);
    onValueChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.nativeEvent.isComposing ||
      (e.key !== "," && e.key !== " ") ||
      !inputValue.trim()
    ) {
      return;
    }

    handleAddTag(inputValue.replace(/[\s,]+$/u, ""));
  };

  const currentError = localError || externalError;

  // 제안 리스트 (이미 선택되지 않은 태그들)
  const suggestions = availableTags.filter(
    (tag) => !value.some((v) => v.toLowerCase() === tag.name.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-background px-3 py-2 shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        {value.map((tag, index) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex h-7 items-center gap-1 rounded-md border-none bg-gray-100 px-2 text-sm hover:bg-gray-100"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(index)}
              className="hover:text-red-500 rounded-full focus:outline-none"
              aria-label={`제거 ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={value.length >= maxTags ? "최대 5개" : placeholder}
          disabled={value.length >= maxTags}
          className="h-7 min-w-32 w-auto flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      <p
        className={
          currentError
            ? "text-xs font-medium text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {currentError ??
          (value.length >= maxTags
            ? `태그를 ${maxTags}개 모두 추가했습니다.`
            : "스페이스 또는 쉼표로 태그를 추가하세요.")}
      </p>

      {/* 추천 목록 */}
      {suggestions.length > 0 && inputValue.trim() && (
        <div className="border rounded-xl bg-popover text-popover-foreground shadow-md max-h-[160px] overflow-y-auto p-1 space-y-0.5">
          {suggestions
            .filter((tag) =>
              tag.name
                .toLowerCase()
                .includes(inputValue.toLowerCase().replace("#", "")),
            )
            .map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAddTag(tag.name)}
                className="w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-accent hover:text-accent-foreground font-medium flex items-center gap-1.5"
              >
                <Hash className="size-3 text-muted-foreground" />
                <span>{tag.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
