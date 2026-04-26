"use client";

import type { StatsScope } from "@/lib/api/ledger-stats";

const OPTIONS: { label: string; value: StatsScope }[] = [
  { label: "전체", value: "all" },
  { label: "공용", value: "shared" },
  { label: "개인", value: "personal" },
];

interface ScopeToggleProps {
  value: StatsScope;
  onChange: (scope: StatsScope) => void;
}

export function ScopeToggle({ value, onChange }: ScopeToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 gap-1 mb-4">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
