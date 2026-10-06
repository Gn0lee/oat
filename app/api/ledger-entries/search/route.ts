import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { searchLedgerEntriesScoped } from "@/lib/api/ledger";
import { getLedgerBook } from "@/lib/api/ledger-books";
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

    const householdId = await getUserHouseholdId(supabase, user.id);
    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    const bookId = searchParams.get("book") ?? undefined;
    if (bookId !== undefined && !z.uuid().safeParse(bookId).success) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 장부 ID입니다.",
        400,
      );
    }
    if (bookId) await getLedgerBook(supabase, householdId, bookId);

    const result = await searchLedgerEntriesScoped(supabase, householdId, {
      query,
      bookId,
      cursor: searchParams.get("cursor") ?? undefined,
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
