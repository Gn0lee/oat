export type LedgerBookVisibility = "shared" | "personal";

export interface LedgerBook {
  id: string;
  name: string;
  visibility: LedgerBookVisibility;
  createdBy: string | null;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
