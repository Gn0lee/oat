import { redirect } from "next/navigation";

export default function LegacyHouseholdPage() {
  redirect("/settings/household");
}
