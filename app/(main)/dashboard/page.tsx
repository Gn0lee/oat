import { PlusCircle, Users } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
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

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 bg-primary/10 rounded-full">
                <PlusCircle className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-gray-900">거래 등록</p>
                <p className="text-sm text-gray-500">매수/매도 기록 추가</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/transactions/new">등록하기</Link>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 bg-primary/10 rounded-full">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-gray-900">가구 관리</p>
                <p className="text-sm text-gray-500">구성원 관리 및 초대</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/household">관리하기</Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm">
          대시보드는 추후 구현 예정입니다
        </p>
      </div>
    </div>
  );
}
