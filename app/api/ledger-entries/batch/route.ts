import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createLedgerEntry } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { createLedgerEntrySchema } from "@/schemas/ledger-entry";

const batchSchema = z.object({
  entries: z.array(createLedgerEntrySchema).min(1).max(20),
});

/**
 * POST /api/ledger-entries/batch
 * 가계부 항목 일괄 생성 (최대 20건)
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
    const result = batchSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
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

    const created = await Promise.all(
      result.data.entries.map((entry) =>
        createLedgerEntry(supabase, {
          householdId,
          ownerId: user.id,
          type: entry.type,
          amount: entry.amount,
          transactedAt: entry.transactedAt,
          title: entry.title,
          categoryId: entry.categoryId,
          fromAccountId: entry.fromAccountId,
          fromPaymentMethodId: entry.fromPaymentMethodId,
          toAccountId: entry.toAccountId,
          toPaymentMethodId: entry.toPaymentMethodId,
          isShared: entry.isShared,
          memo: entry.memo,
        }),
      ),
    );

    return NextResponse.json(
      { data: created, count: created.length },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger batch creation error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
