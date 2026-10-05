import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types";

export interface LedgerStatsRequestContext {
  supabase: SupabaseClient<Database>;
  householdId: string;
  userId: string;
  searchParams: URLSearchParams;
}

// Shared auth → household → handler → `{ data }` / `{ error }` envelope for the
// /api/ledger/stats/* routes.
export async function respondWithLedgerStats(
  request: NextRequest,
  load: (context: LedgerStatsRequestContext) => Promise<unknown>,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const householdId = await getUserHouseholdId(supabase, user.id);
    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    const data = await load({
      supabase,
      householdId,
      userId: user.id,
      searchParams: request.nextUrl.searchParams,
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }
    console.error("Ledger stats error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
