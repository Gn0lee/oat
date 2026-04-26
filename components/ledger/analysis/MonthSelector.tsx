"use client";

import { addMonths, getYear, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENT_YEAR = getYear(new Date());
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 5 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface MonthSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <button
        type="button"
        onClick={() => onChange(subMonths(value, 1))}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="이전 달"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex items-center gap-2">
        <Select
          value={String(value.getFullYear())}
          onValueChange={(v) => {
            const next = new Date(value);
            next.setFullYear(Number(v));
            onChange(next);
          }}
        >
          <SelectTrigger className="w-[80px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(value.getMonth() + 1)}
          onValueChange={(v) => {
            const next = new Date(value);
            next.setMonth(Number(v) - 1);
            onChange(next);
          }}
        >
          <SelectTrigger className="w-[70px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => onChange(addMonths(value, 1))}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="다음 달"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
