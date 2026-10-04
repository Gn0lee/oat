"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { HouseholdRole } from "@/types";

interface LedgerIdentity {
  userId: string | null;
  householdId: string | null;
  role: HouseholdRole | null;
}

const LedgerIdentityContext = createContext<LedgerIdentity>({
  userId: null,
  householdId: null,
  role: null,
});

export function LedgerIdentityProvider({
  value,
  children,
}: {
  value: LedgerIdentity;
  children: ReactNode;
}) {
  return (
    <LedgerIdentityContext.Provider value={value}>
      {children}
    </LedgerIdentityContext.Provider>
  );
}

export function useLedgerIdentity() {
  return useContext(LedgerIdentityContext);
}
