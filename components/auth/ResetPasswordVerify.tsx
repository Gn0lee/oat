"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "@/app/(auth)/reset-password/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  type NewPasswordFormData,
  newPasswordSchema,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";

interface ResetPasswordVerifyProps {
  email: string;
}

export function ResetPasswordVerify({ email }: ResetPasswordVerifyProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleVerifyOtp = async () => {
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
        type: "recovery",
      });

      if (error) {
        setError(
          error.message === "Token has expired or is invalid"
            ? "인증 코드가 만료되었거나 올바르지 않습니다"
            : error.message,
        );
        return;
      }

      setIsVerified(true);
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
      const result = await resetPasswordAction({ email });

      if (result.error) {
        setError(result.error);
        return;
      }

      setOtp("");
      alert("인증 코드를 다시 보냈습니다");
    } catch {
      setError("인증 메일 재발송에 실패했습니다");
    } finally {
      setIsResending(false);
    }
  };

  const onSubmitNewPassword = async (data: NewPasswordFormData) => {
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      if (error.message.includes("should be different")) {
        setError("새 비밀번호는 기존 비밀번호와 달라야 합니다");
      } else {
        setError("비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
      }
      return;
    }

    // 로그아웃 후 로그인 페이지로 이동
    await supabase.auth.signOut();
    router.replace(
      "/login?message=비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.",
    );
  };

  if (isVerified) {
    return (
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">새 비밀번호 설정</CardTitle>
          <CardDescription className="text-base mt-2">
            새로운 비밀번호를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmitNewPassword)}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                새 비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="영문, 숫자 포함 8자 이상"
                className="h-12 rounded-xl"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">
                새 비밀번호 확인
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                className="h-12 rounded-xl"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

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
            onComplete={handleVerifyOtp}
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
          onClick={handleVerifyOtp}
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
            {isResending ? "발송 중..." : "인증 코드 다시 받기"}
          </Button>
        </div>

        <Button asChild variant="outline" className="w-full h-12 rounded-xl">
          <Link href="/login">로그인 페이지로</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
