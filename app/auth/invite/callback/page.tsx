"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
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
      <AuthShell title="초대 확인">
        <AuthNotice
          tone="error"
          title="초대 링크를 처리하지 못했습니다"
          description={error}
          primaryAction={
            <Button asChild className="w-full h-12 rounded-xl">
              <Link href="/login">로그인 페이지로 이동</Link>
            </Button>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="초대 확인">
      <AuthNotice
        tone="loading"
        title="초대 링크를 확인하고 있어요"
        description="잠시만 기다려주세요."
      />
    </AuthShell>
  );
}
