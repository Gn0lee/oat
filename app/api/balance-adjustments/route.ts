import { NextResponse } from "next/server";
import { createBalanceAdjustment } from "@/lib/api/balance-adjustment";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";
import { createBalanceAdjustmentSchema } from "@/schemas/balance-adjustment";

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
    const result = createBalanceAdjustmentSchema.safeParse(body);

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

    const adjustment = await createBalanceAdjustment(supabase, {
      householdId,
      ownerId: user.id,
      targetType: result.data.targetType,
      accountId: result.data.accountId,
      paymentMethodId: result.data.paymentMethodId,
      actualBalance: result.data.actualBalance,
      adjustedAt: result.data.adjustedAt,
      memo: result.data.memo,
    });

    return NextResponse.json({ data: adjustment }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Balance adjustment creation error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
