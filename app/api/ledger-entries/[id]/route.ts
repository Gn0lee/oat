import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  deleteLedgerEntryWithBalanceSync,
  getLedgerEntryById,
  updateLedgerEntryWithBalanceSync,
} from "@/lib/api/ledger";
import {
  notifyLedgerEntryDeleted,
  notifyLedgerEntryUpdated,
} from "@/lib/api/ledger-notifications";
import { markNotificationsAsReadForLinkBestEffort } from "@/lib/api/notifications";
import { createClient } from "@/lib/supabase/server";
import { updateLedgerEntrySchema } from "@/schemas/ledger-entry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ledger-entries/[id]
 * 가계부 항목 단건 조회
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const entry = await getLedgerEntryById(supabase, id, householdId);
    await markNotificationsAsReadForLinkBestEffort(supabase, user.id, {
      kind: "ledger_record_detail",
      params: { entryId: id },
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger entry detail error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/ledger-entries/[id]
 * 가계부 항목 수정 (본인 항목만)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const result = updateLedgerEntrySchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const input = result.data;

    const { data: previousEntry } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const entry = await updateLedgerEntryWithBalanceSync(
      supabase,
      id,
      user.id,
      {
        type: input.type,
        amount: input.amount,
        transactedAt: input.transactedAt,
        title: input.title,
        categoryId: input.categoryId,
        fromAccountId: input.fromAccountId,
        fromPaymentMethodId: input.fromPaymentMethodId,
        toAccountId: input.toAccountId,
        toPaymentMethodId: input.toPaymentMethodId,
        memo: input.memo,
        tags: input.tags,
      },
    );

    if (previousEntry) {
      await notifyLedgerEntryUpdated(supabase, {
        actorId: user.id,
        previousEntry,
        updatedEntry: entry,
      });
    }

    return NextResponse.json({ data: entry });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger entry update error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ledger-entries/[id]
 * 가계부 항목 삭제 (본인 항목만)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const { data: existingEntry } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    await deleteLedgerEntryWithBalanceSync(supabase, id, user.id);

    if (existingEntry) {
      await notifyLedgerEntryDeleted(supabase, {
        actorId: user.id,
        entry: existingEntry,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger entry delete error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
