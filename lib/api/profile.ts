import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Database, Profile } from "@/types";

export async function getProfile(
  supabase: SupabaseClient<Database>,
): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    throw new APIError("AUTH_ERROR", "인증에 실패했습니다.", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile === null) {
    throw new APIError("PROFILE_ERROR", "프로필 조회에 실패했습니다.", 404);
  }

  return profile;
}
