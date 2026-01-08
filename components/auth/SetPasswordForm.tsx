"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type SetPasswordFormData,
  setPasswordSchema,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SetPasswordFormData) => {
    setServerError(null);

    const supabase = createClient();

    // 비밀번호 설정
    const { error: passwordError } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (passwordError) {
      setServerError(passwordError.message);
      return;
    }

    // 프로필 이름 업데이트
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: data.name })
        .eq("id", user.id);

      if (profileError) {
        setServerError(profileError.message);
        return;
      }
    }

    router.replace("/dashboard");
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
        disabled={isSubmitting}
      >
        {isSubmitting ? "설정 중..." : "비밀번호 설정"}
      </Button>
    </form>
  );
}
