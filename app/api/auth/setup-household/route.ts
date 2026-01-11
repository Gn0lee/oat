import { NextResponse } from "next/server";
import {
  acceptInvitation,
  createHouseholdWithOwner,
  getPendingInvitationForUser,
  getUserHouseholdId,
} from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 이미 가구가 있는지 확인
    const existingHouseholdId = await getUserHouseholdId(supabase, user.id);
    if (existingHouseholdId) {
      return NextResponse.json({
        success: true,
        householdId: existingHouseholdId,
        message: "Already has household",
      });
    }

    // 초대가 있는지 확인
    if (user.email) {
      const invitation = await getPendingInvitationForUser(
        supabase,
        user.email,
      );

      if (invitation) {
        await acceptInvitation(supabase, invitation, user.id);
        return NextResponse.json({
          success: true,
          householdId: invitation.household_id,
          message: "Invitation accepted",
        });
      }
    }

    // 초대가 없으면 새 가구 생성
    const householdId = await createHouseholdWithOwner(supabase, user.id);
    return NextResponse.json({
      success: true,
      householdId,
      message: "Household created",
    });
  } catch (error) {
    console.error("[setup-household] Error:", error);
    return NextResponse.json(
      { error: "Failed to setup household" },
      { status: 500 },
    );
  }
}
