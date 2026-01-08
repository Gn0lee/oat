import { type NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  createHouseholdWithOwner,
  getPendingInvitationForUser,
  getUserHouseholdId,
} from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 가구 연결 처리
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const existingHouseholdId = await getUserHouseholdId(supabase, user.id);

        if (!existingHouseholdId) {
          // 초대가 있으면 수락, 없으면 새 가구 생성
          const invitation = await getPendingInvitationForUser(
            supabase,
            user.email,
          );

          if (invitation) {
            await acceptInvitation(supabase, invitation, user.id);
          } else {
            await createHouseholdWithOwner(supabase, user.id);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
