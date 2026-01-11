import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createBatchTransactions } from "@/lib/api/transaction";
import { createClient } from "@/lib/supabase/server";
import { createBatchTransactionSchema } from "@/schemas/transaction";

/**
 * POST /api/transactions/batch
 * 배치 거래 기록 생성 (여러 거래 일괄 등록)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 요청 body 파싱 및 검증
    const body = await request.json();
    const result = createBatchTransactionSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const input = result.data;

    // 사용자의 가구 조회
    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    // 배치 거래 생성
    const transactions = await createBatchTransactions(supabase, {
      householdId,
      ownerId: user.id,
      type: input.type,
      transactedAt: input.transactedAt,
      accountId: input.accountId,
      items: input.items.map((item) => ({
        ticker: item.ticker,
        quantity: item.quantity,
        price: item.price,
        memo: item.memo,
        stock: {
          name: item.stock.name,
          market: item.stock.market,
          currency: item.stock.currency,
          assetType: item.stock.assetType,
        },
      })),
    });

    return NextResponse.json(
      { data: transactions, count: transactions.length },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Batch transaction creation error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
