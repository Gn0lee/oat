"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <CardTitle className="text-xl">이메일을 확인해주세요</CardTitle>
        <CardDescription className="text-base mt-2">
          <span className="font-medium text-gray-900">{email}</span>
          <br />
          으로 인증 코드를 보냈습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || isVerifying}
          className="w-full h-12 rounded-xl"
        >
          {isVerifying ? "확인 중..." : "인증하기"}
        </Button>

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

        <Button asChild variant="outline" className="w-full h-12 rounded-xl">
          <Link href="/login">로그인 페이지로</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
