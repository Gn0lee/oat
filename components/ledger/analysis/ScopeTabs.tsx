"use client";

import { usePathname, useRouter } from "next/navigation";

interface ScopeTabsProps {
  scope: "shared" | "personal";
}

export function ScopeTabs({ scope }: ScopeTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (next: "shared" | "personal") => {
    router.push(`${pathname}?scope=${next}`);
  };

  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-1 mb-2">
      <button
        type="button"
        onClick={() => handleChange("shared")}
        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
          scope === "shared"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        공용 지출
      </button>
      <button
        type="button"
        onClick={() => handleChange("personal")}
        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
          scope === "personal"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        내 지출
      </button>
    </div>
  );
}
