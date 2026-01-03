import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * 서버 컴포넌트/Server Action에서 현재 인증된 사용자 조회
 * @returns User 객체 또는 null (미인증)
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 서버 컴포넌트/Server Action에서 인증 필수 사용자 조회
 * @throws Error 미인증 시
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * 회원가입 (서버 액션용)
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  redirectTo?: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 이메일/비밀번호 로그인 (서버 액션용)
 */
export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 로그아웃 (서버 액션용)
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function resetPassword(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    throw error;
  }
}

/**
 * 비밀번호 업데이트 (재설정 링크 클릭 후)
 */
export async function updatePassword(newPassword: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}
