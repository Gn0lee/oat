import { redirect } from "next/navigation";

export default function LedgerNewPage() {
  redirect("/ledger/records/new/full");
}
