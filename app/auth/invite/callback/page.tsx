"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export default function InviteCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // URL hash에서 토큰 파싱
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("유효하지 않은 초대 링크입니다.");
        return;
      }

      // 수동으로 세션 설정
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("Invite callback error:", error);
        setError("초대 링크 처리 중 오류가 발생했습니다.");
        return;
      }

      if (data.session) {
        // 초대 수락 API 호출 (가구 연결)
        const acceptResponse = await fetch("/api/invitations/accept", {
          method: "POST",
        });

        if (!acceptResponse.ok) {
          const errorData = await acceptResponse.json();
          console.error("Accept invitation error:", errorData);
          setError("초대 수락 처리 중 오류가 발생했습니다.");
          return;
        }

        // 비밀번호 설정 페이지로 이동
        router.replace("/set-password");
      } else {
        setError("세션을 설정할 수 없습니다.");
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="text-blue-600 hover:underline"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner className="size-6 sm:size-8 md:size-10 text-gray-400" />
    </div>
  );
}
