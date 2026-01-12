"use server";

import { resetPassword } from "@/lib/supabase/auth";

interface ResetPasswordActionInput {
  email: string;
}

interface ResetPasswordActionResult {
  error?: string;
}

export async function resetPasswordAction(
  input: ResetPasswordActionInput,
): Promise<ResetPasswordActionResult> {
  try {
    await resetPassword(input.email);
    return {};
  } catch (error) {
    if (error instanceof Error) {
      console.error("Reset password error:", error.message);
    }
    return {
      error: "비밀번호 재설정 메일 발송에 실패했습니다. 다시 시도해주세요.",
    };
  }
}
