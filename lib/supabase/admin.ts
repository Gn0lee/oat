import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

/**
 * Supabase Admin 클라이언트
 * service_role 키를 사용하여 RLS를 우회하고 Admin API에 접근합니다.
 * 서버 사이드(API Route, Server Action)에서만 사용해야 합니다.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY environment variable",
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
