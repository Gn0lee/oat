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
  const next = searchParams.get("next") ?? "/home";

  console.log("[auth/callback] Started", {
    hasCode: !!code,
    codeLength: code?.length,
    origin,
    next,
  });

  if (!code) {
    console.error("[auth/callback] No code provided");
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log("[auth/callback] exchangeCodeForSession result", {
    hasData: !!data,
    hasSession: !!data?.session,
    hasUser: !!data?.user,
    error: error
      ? {
          message: error.message,
          status: error.status,
          code: error.code,
        }
      : null,
  });

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error", error);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`,
    );
  }

  // 가구 연결 처리
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[auth/callback] getUser result", {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
  });

  if (user?.email) {
    try {
      const existingHouseholdId = await getUserHouseholdId(supabase, user.id);
      console.log("[auth/callback] existingHouseholdId", existingHouseholdId);

      if (!existingHouseholdId) {
        // 초대가 있으면 수락, 없으면 새 가구 생성
        const invitation = await getPendingInvitationForUser(
          supabase,
          user.email,
        );
        console.log("[auth/callback] invitation", invitation);

        if (invitation) {
          await acceptInvitation(supabase, invitation, user.id);
          console.log("[auth/callback] Invitation accepted");
        } else {
          await createHouseholdWithOwner(supabase, user.id);
          console.log("[auth/callback] New household created");
        }
      }
    } catch (householdError) {
      console.error(
        "[auth/callback] Household processing error",
        householdError,
      );
      // 가구 처리 실패해도 로그인은 성공으로 처리
    }
  }

  console.log("[auth/callback] Success, redirecting to", `${origin}${next}`);
  return NextResponse.redirect(`${origin}${next}`);
}
