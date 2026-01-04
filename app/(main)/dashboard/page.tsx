import { LogoutButton } from "@/components/auth/LogoutButton";
import { AcceptInvitation } from "@/components/household/AcceptInvitation";
import { InvitationCode } from "@/components/household/InvitationCode";
import { getUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">로그인된 사용자</p>
          <p className="text-lg font-medium text-gray-900">{user?.email}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <InvitationCode />
          <AcceptInvitation />
        </div>

        <p className="text-center text-gray-400 text-sm">
          대시보드는 추후 구현 예정입니다
        </p>
      </div>
    </div>
  );
}
