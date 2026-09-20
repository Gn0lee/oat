import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { searchLedgerEntries } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";

const SEARCH_PAGE_SIZE = 20;

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

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q")?.trim() ?? "";
    if (query.replace(/\s/g, "").length < 2) {
      throw new APIError(
        "LEDGER_SEARCH_QUERY_TOO_SHORT",
        "검색어를 2자 이상 입력해주세요.",
        400,
      );
    }

    const scope = searchParams.get("scope");
    if (scope !== "shared" && scope !== "personal") {
      throw new APIError(
        "LEDGER_SEARCH_SCOPE_INVALID",
        "검색 범위를 선택해주세요.",
        400,
      );
    }

    const offsetParam = Number(searchParams.get("offset") ?? 0);
    const offset =
      Number.isInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    const result = await searchLedgerEntries(supabase, householdId, {
      query,
      scope,
      offset,
      limit: SEARCH_PAGE_SIZE,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger entry search route error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
