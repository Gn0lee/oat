"use client";

import { Hash, Plus, X } from "lucide-react";
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
  placeholder = "태그 입력...",
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
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const currentError = localError || externalError;

  // 제안 리스트 (이미 선택되지 않은 태그들)
  const suggestions = availableTags.filter(
    (tag) => !value.some((v) => v.toLowerCase() === tag.name.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      {/* 선택된 태그 칩 목록 */}
      <div className="flex flex-wrap gap-2">
        {value.map((tag, index) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2.5 py-1 text-sm bg-gray-100 hover:bg-gray-200 border-none rounded-lg"
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
      </div>

      {/* 태그 입력 및 추가 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={value.length >= maxTags}
            className="h-10 px-3 pr-8 rounded-xl font-normal"
          />
          <Hash className="absolute right-3 top-3 size-4 text-gray-400" />
        </div>
        <button
          type="button"
          onClick={() => handleAddTag(inputValue)}
          disabled={value.length >= maxTags || !inputValue.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* 에러 메시지 */}
      {currentError && (
        <p className="text-xs font-medium text-destructive">{currentError}</p>
      )}

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
