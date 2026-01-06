import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StockSettingsList } from "@/components/stock-settings/StockSettingsList";
import { Button } from "@/components/ui/button";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getStockSettings } from "@/lib/api/stock-settings";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StockSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 가구 정보 조회
  const householdId = await getUserHouseholdId(supabase, user.id);

  if (!householdId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500 py-12">
            가구 정보를 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  // 초기 종목 설정 조회
  const initialData = await getStockSettings(supabase, householdId, {
    pagination: { page: 1, pageSize: 20 },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">종목 설정</h1>
              <p className="text-sm text-gray-500">
                총 {initialData.total}개 종목 등록됨
              </p>
            </div>
          </div>
        </div>

        {/* 종목 설정 목록 */}
        <StockSettingsList initialData={initialData} />
      </div>
    </div>
  );
}
