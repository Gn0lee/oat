import Link from "next/link";
import { ScreenState } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";

// Same state for deleted, hidden and other-household book IDs: never reveal which.
export function LedgerBookUnavailable({ href }: { href: string }) {
  return (
    <ScreenState
      type="error"
      title="장부를 볼 수 없음"
      description="이 장부의 기록을 볼 수 없어요."
      action={
        <Button asChild className="min-h-11">
          <Link href={href}>전체 장부로 이동</Link>
        </Button>
      }
    />
  );
}
