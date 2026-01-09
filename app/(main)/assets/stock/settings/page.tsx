import { PageHeader } from "@/components/layout";
import { StockSettingsList } from "@/components/stock-settings/StockSettingsList";
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
      <p className="text-center text-gray-500 py-12">
        가구 정보를 찾을 수 없습니다.
      </p>
    );
  }

  // 초기 종목 설정 조회
  const initialData = await getStockSettings(supabase, householdId, {
    pagination: { page: 1, pageSize: 20 },
  });

  return (
    <>
      <PageHeader
        title="종목 설정"
        subtitle={`총 ${initialData.total}개 종목 등록됨`}
      />

      {/* 종목 설정 목록 */}
      <StockSettingsList initialData={initialData} />
    </>
  );
}
