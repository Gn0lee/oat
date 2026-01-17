"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signUpAction } from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { type SignUpFormData, signUpSchema } from "@/lib/schemas/auth";

export function SignUpForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null);

    const result = await signUpAction({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    startTransition(() => {
      router.push(`/signup/verify?email=${encodeURIComponent(data.email)}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-gray-700">
          이름
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="홍길동"
          className="h-12 rounded-xl"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700">
          비밀번호
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
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-gray-700">
          비밀번호 확인
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

      {serverError && (
        <p className="text-sm text-destructive text-center">{serverError}</p>
      )}

      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-base font-semibold"
        disabled={isSubmitting || isPending}
      >
        {(isSubmitting || isPending) && <Spinner className="mr-2 text-white" />}
        회원가입
      </Button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-primary hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
