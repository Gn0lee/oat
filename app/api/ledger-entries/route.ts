import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createLedgerEntry, getLedgerEntries } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { createLedgerEntrySchema } from "@/schemas/ledger-entry";

/**
 * GET /api/ledger-entries
 * 가계부 항목 목록 조회
 *
 * Query params:
 *   ?year=2026&month=4   → 월간 목록
 *   ?date=2026-04-24     → 일별 목록 (캘린더 상세)
 *   (없음)               → 당월
 */
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
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dateParam = searchParams.get("date");

    const options = {
      year: yearParam ? Number(yearParam) : undefined,
      month: monthParam ? Number(monthParam) : undefined,
      date: dateParam ?? undefined,
    };

    const entries = await getLedgerEntries(supabase, householdId, options);

    return NextResponse.json({ data: entries });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger entries list error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ledger-entries
 * 가계부 항목 생성
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const result = createLedgerEntrySchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const input = result.data;

    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    const entry = await createLedgerEntry(supabase, {
      householdId,
      ownerId: user.id,
      type: input.type,
      amount: input.amount,
      transactedAt: input.transactedAt,
      title: input.title,
      categoryId: input.categoryId,
      fromAccountId: input.fromAccountId,
      fromPaymentMethodId: input.fromPaymentMethodId,
      toAccountId: input.toAccountId,
      toPaymentMethodId: input.toPaymentMethodId,
      isShared: input.isShared,
      memo: input.memo,
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger entry creation error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
