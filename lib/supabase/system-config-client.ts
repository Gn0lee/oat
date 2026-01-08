/**
 * system_config 테이블 전용 Supabase 클라이언트
 *
 * - 로컬 개발 시에도 운영 DB에 접근 가능
 * - Secret Key 사용 (RLS 우회)
 * - 서버 전용 (브라우저에서 사용 금지)
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

let instance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * system_config 전용 Supabase 클라이언트 반환
 *
 * 환경변수 우선순위:
 * 1. SYSTEM_CONFIG_SUPABASE_URL / SYSTEM_CONFIG_SECRET_KEY (운영 DB 직접 접근)
 * 2. NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY (기본 클라이언트)
 */
export function getSystemConfigClient() {
  if (instance) return instance;

  const url =
    process.env.SYSTEM_CONFIG_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SYSTEM_CONFIG_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "system_config 클라이언트: SYSTEM_CONFIG_SUPABASE_URL/SECRET_KEY 또는 기본 환경변수 필요",
    );
  }

  instance = createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return instance;
}

/**
 * 테스트용: 싱글톤 인스턴스 초기화
 */
export function resetSystemConfigClient() {
  instance = null;
}
