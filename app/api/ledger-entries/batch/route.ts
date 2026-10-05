import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createBatchLedgerEntriesWithBalanceSync } from "@/lib/api/ledger";
import { notifyBatchLedgerEntriesCreated } from "@/lib/api/ledger-notifications";
import { logLegacyLedgerContract } from "@/lib/api/legacy-ledger-contract";
import { createClient } from "@/lib/supabase/server";
import { createLedgerEntrySchema } from "@/schemas/ledger-entry";

const batchSchema = z.object({
  entries: z.array(createLedgerEntrySchema).min(1).max(20),
  requestId: z.string().uuid().optional(),
});

/** POST /api/ledger-entries/batch — atomic create of up to 20 entries. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new APIError("VALIDATION_ERROR", "유효하지 않은 요청입니다.", 400);
    }
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }
    const householdId = await getUserHouseholdId(supabase, user.id);
    if (!householdId)
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );

    if (parsed.data.entries.some((entry) => !entry.bookId)) {
      logLegacyLedgerContract("entry-create-is-shared", "ledger-entries/batch");
    }

    const entries = parsed.data.entries.map((entry) => ({
      householdId,
      ownerId: user.id,
      bookId: entry.bookId,
      type: entry.type,
      amount: entry.amount,
      transactedAt: entry.transactedAt,
      title: entry.title,
      categoryId: entry.categoryId,
      fromAccountId: entry.fromAccountId,
      fromPaymentMethodId: entry.fromPaymentMethodId,
      toAccountId: entry.toAccountId,
      toPaymentMethodId: entry.toPaymentMethodId,
      isShared: "isShared" in entry ? entry.isShared : undefined,
      memo: entry.memo,
      tags: entry.tags,
    }));
    const result = await createBatchLedgerEntriesWithBalanceSync(
      supabase,
      user.id,
      householdId,
      entries,
      parsed.data.requestId,
    );
    if (!result.replayed) {
      await notifyBatchLedgerEntriesCreated(supabase, {
        actorId: user.id,
        householdId,
        entries: result.entries,
      });
    }
    return NextResponse.json(
      { data: result.entries, count: result.entries.length },
      { status: result.replayed ? 200 : 201 },
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
