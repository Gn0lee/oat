import { Plus } from "lucide-react";
import Link from "next/link";
import { AssetsPageClient } from "@/components/assets";
import { PageActions } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AssetsPage() {
  return (
    <>
      <PageActions>
        <Button size="sm" asChild>
          <Link href="/assets/stock/transactions/new/full">
            <Plus className="w-4 h-4 mr-1" />
            자산 기록
          </Link>
        </Button>
      </PageActions>
      <AssetsPageClient />
    </>
  );
}
