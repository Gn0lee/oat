import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  getLedgerTags,
  getLedgerTagsForScope,
  type LedgerTag,
} from "@/lib/api/ledger-tags";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl;
    const scopeParam = searchParams.get("scope");

    let tags: LedgerTag[];
    if (scopeParam === "shared" || scopeParam === "personal") {
      tags = await getLedgerTagsForScope(
        supabase,
        householdId,
        user.id,
        scopeParam,
      );
    } else {
      tags = await getLedgerTags(supabase, householdId);
    }

    return NextResponse.json({ data: tags });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger tags fetch error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
