"use server";

import { headers } from "next/headers";
import { signUp } from "@/lib/supabase/auth";

interface SignUpActionInput {
  name: string;
  email: string;
  password: string;
}

interface SignUpActionResult {
  error?: string;
}

export async function signUpAction(
  input: SignUpActionInput,
): Promise<SignUpActionResult> {
  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") ?? "http";
    const origin = `${protocol}://${host}`;

    await signUp(
      input.email,
      input.password,
      input.name,
      `${origin}/auth/callback`,
    );
    return {};
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        return { error: "이미 가입된 이메일입니다" };
      }
      return { error: error.message };
    }
    return { error: "회원가입에 실패했습니다. 다시 시도해주세요." };
  }
}
