"use server";

import { signIn } from "@/lib/supabase/auth";

interface SignInActionInput {
  email: string;
  password: string;
}

interface SignInActionResult {
  error?: string;
}

export async function signInAction(
  input: SignInActionInput,
): Promise<SignInActionResult> {
  try {
    await signIn(input.email, input.password);
    return {};
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Invalid login credentials")) {
        return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "이메일 인증이 완료되지 않았습니다" };
      }
      return { error: error.message };
    }
    return { error: "로그인에 실패했습니다. 다시 시도해주세요." };
  }
}
