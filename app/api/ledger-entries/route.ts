import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  createLedgerEntryWithBalanceSync,
  getLedgerEntries,
} from "@/lib/api/ledger";
import { notifyLedgerEntryCreated } from "@/lib/api/ledger-notifications";
import { logLegacyLedgerContract } from "@/lib/api/legacy-ledger-contract";
import { markNotificationsAsReadForLinkBestEffort } from "@/lib/api/notifications";
import { createClient } from "@/lib/supabase/server";
import { createLedgerEntrySchema } from "@/schemas/ledger-entry";
import type { LedgerEntryType } from "@/types";

/**
 * GET /api/ledger-entries
 * 가계부 항목 목록 조회
 *
 * Query params:
 *   ?year=2026&month=4   → 월간 목록
 *   ?date=2026-04-24     → 일별 목록 (캘린더 상세)
 *   (없음)               → 당월
 *   ?book=<장부 ID>      → 해당 장부만 (없으면 전체 장부)
 *   ?type, ?categoryId, ?childCategoryId, ?categoryBreakdown, ?paymentMethodId
 *                        → 분석 전체보기 조건
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
    if (
      (yearParam !== null &&
        (!Number.isInteger(Number(yearParam)) ||
          Number(yearParam) < 1900 ||
          Number(yearParam) > 9999)) ||
      (monthParam !== null &&
        (!Number.isInteger(Number(monthParam)) ||
          Number(monthParam) < 1 ||
          Number(monthParam) > 12)) ||
      (dateParam !== null &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam) ||
          Number.isNaN(Date.parse(`${dateParam}T00:00:00Z`)) ||
          new Date(`${dateParam}T00:00:00Z`).toISOString().slice(0, 10) !==
            dateParam))
    ) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 조회 기간입니다.",
        400,
      );
    }
    const scopeParam = searchParams.get("scope");
    if (
      scopeParam !== null &&
      !["all", "shared", "personal"].includes(scopeParam)
    ) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 조회 범위입니다.",
        400,
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
    const scope: "shared" | "personal" | undefined =
      scopeParam === "personal" || scopeParam === "shared"
        ? scopeParam
        : undefined;

    const tagIdParams = searchParams.getAll("tagId");
    if (scope) logLegacyLedgerContract("entries-scope", "ledger-entries");
    if (tagIdParams.length > 0) {
      logLegacyLedgerContract("entries-tag-filter", "ledger-entries");
    }

    const typeParam = searchParams.get("type");
    if (
      typeParam !== null &&
      !["expense", "income", "transfer", "non_expense_withdrawal"].includes(
        typeParam,
      )
    ) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 기록 유형입니다.",
        400,
      );
    }

    const categoryBreakdown =
      searchParams.get("categoryBreakdown") === "direct"
        ? ("direct" as const)
        : undefined;

    const options = {
      bookId,
      includeBookDetails: true,
      year: yearParam ? Number(yearParam) : undefined,
      month: monthParam ? Number(monthParam) : undefined,
      date: dateParam ?? undefined,
      scope: bookId ? undefined : scope,
      userId: user.id,
      tagIds: tagIdParams.length > 0 ? tagIdParams : undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      childCategoryId: searchParams.get("childCategoryId") ?? undefined,
      categoryBreakdown,
      type: (typeParam ?? undefined) as LedgerEntryType | undefined,
      paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
    };

    const entries = await getLedgerEntries(supabase, householdId, options);
    if (dateParam) {
      await markNotificationsAsReadForLinkBestEffort(supabase, user.id, {
        kind: "ledger_record_date",
        params: { date: dateParam },
      });
    }

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new APIError("VALIDATION_ERROR", "유효하지 않은 요청입니다.", 400);
    }
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

    const entry = await createLedgerEntryWithBalanceSync(supabase, {
      householdId,
      ownerId: user.id,
      bookId: input.bookId,
      type: input.type,
      amount: input.amount,
      transactedAt: input.transactedAt,
      title: input.title,
      categoryId: input.categoryId,
      fromAccountId: input.fromAccountId,
      fromPaymentMethodId: input.fromPaymentMethodId,
      toAccountId: input.toAccountId,
      toPaymentMethodId: input.toPaymentMethodId,
      isShared: "isShared" in input ? input.isShared : undefined,
      memo: input.memo,
      tags: input.tags,
    });

    await notifyLedgerEntryCreated(supabase, {
      actorId: user.id,
      householdId,
      entry,
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
