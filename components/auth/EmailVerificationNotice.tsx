"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { createClient } from "@/lib/supabase/client";

interface EmailVerificationNoticeProps {
  email: string;
}

export function EmailVerificationNotice({
  email,
}: EmailVerificationNoticeProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요");
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (error) {
        setError(
          error.message === "Token has expired or is invalid"
            ? "인증 코드가 만료되었거나 올바르지 않습니다"
            : error.message,
        );
        return;
      }

      // 가구 생성 API 호출
      await fetch("/api/auth/setup-household", { method: "POST" });

      router.push("/home");
    } catch {
      setError("인증에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setIsResending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        email,
        type: "signup",
      });

      if (error) {
        setError("인증 메일 재발송에 실패했습니다");
        return;
      }

      setOtp("");
      alert("인증 메일을 다시 보냈습니다");
    } catch {
      setError("인증 메일 재발송에 실패했습니다");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthNotice
      tone="info"
      title="이메일을 확인해주세요"
      description={
        <>
          <span className="font-medium text-gray-900">{email}</span>
          <br />
          으로 인증 코드를 보냈습니다
        </>
      }
      primaryAction={
        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || isVerifying}
          className="w-full h-12 rounded-xl"
        >
          {isVerifying ? "확인 중..." : "인증하기"}
        </Button>
      }
      secondaryAction={
        <Button asChild variant="outline" className="w-full h-12 rounded-xl">
          <Link href="/login">로그인 페이지로</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            onComplete={handleVerify}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            메일이 오지 않았다면 스팸함을 확인해주세요.
          </p>
          <Button
            variant="link"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm"
          >
            {isResending ? "발송 중..." : "인증 메일 다시 받기"}
          </Button>
        </div>
      </div>
    </AuthNotice>
  );
}
