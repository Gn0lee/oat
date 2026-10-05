"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getKstToday } from "@/lib/date";
import {
  type LedgerAnalysisState,
  ledgerAnalysisHref,
  readLedgerAnalysisState,
  withLedgerAnalysisState,
} from "@/lib/ledger-books/analysis-url";

// Analysis scope lives in the URL so refresh, back and direct links restore it.
export function useLedgerAnalysisUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = new URLSearchParams(useSearchParams().toString());
  const state = readLedgerAnalysisState(searchParams, getKstToday());

  const urlWith = (changes: Partial<LedgerAnalysisState>) => {
    const next = withLedgerAnalysisState(searchParams, changes);
    return next.size ? `${pathname}?${next}` : pathname;
  };

  return {
    ...state,
    monthDate: new Date(state.year, state.month - 1, 1),
    setMonth: (date: Date) =>
      router.replace(
        urlWith({ year: date.getFullYear(), month: date.getMonth() + 1 }),
        { scroll: false },
      ),
    setType: (type: LedgerAnalysisState["type"]) =>
      router.replace(urlWith({ type }), { scroll: false }),
    setBook: (bookId: string | undefined) => router.push(urlWith({ bookId })),
    allBooksHref: urlWith({ bookId: undefined }),
    hrefFor: (target: string) => ledgerAnalysisHref(target, state),
  };
}
