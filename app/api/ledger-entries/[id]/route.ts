import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { deleteLedgerEntry, updateLedgerEntry } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { updateLedgerEntrySchema } from "@/schemas/ledger-entry";

interface RouteParams {
  params: Promise<{ id: string }>;
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

    const entry = await updateLedgerEntry(supabase, id, user.id, {
      type: input.type,
      amount: input.amount,
      transactedAt: input.transactedAt,
      categoryId: input.categoryId,
      fromAccountId: input.fromAccountId,
      fromPaymentMethodId: input.fromPaymentMethodId,
      toAccountId: input.toAccountId,
      toPaymentMethodId: input.toPaymentMethodId,
      isShared: input.isShared,
      memo: input.memo,
    });

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

    await deleteLedgerEntry(supabase, id, user.id);

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
