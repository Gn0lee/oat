"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "@/app/(auth)/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ResetPasswordRequestFormData,
  resetPasswordRequestSchema,
} from "@/lib/schemas/auth";

export function ResetPasswordRequestForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ResetPasswordRequestFormData>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordRequestFormData) => {
    setServerError(null);

    const result = await resetPasswordAction({
      email: data.email,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    router.push(
      `/reset-password/verify?email=${encodeURIComponent(data.email)}`,
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-700">
          이메일
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="example@email.com"
          className="h-12 rounded-xl"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-destructive text-center">{serverError}</p>
      )}

      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-base font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? "발송 중..." : "인증 코드 받기"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-primary hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}
