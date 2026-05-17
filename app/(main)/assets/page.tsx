import { Plus } from "lucide-react";
import Link from "next/link";
import { AssetsPageClient } from "@/components/assets";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AssetsPage() {
  return (
    <>
      <PageHeader
        title="내 자산"
        action={
          <Link href="/assets/stock/transactions/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              자산 기록
            </Button>
          </Link>
        }
      />
      <AssetsPageClient />
    </>
  );
}
