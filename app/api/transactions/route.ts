import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  createTransaction,
  getTransactions,
  type TransactionFilters,
} from "@/lib/api/transaction";
import { createClient } from "@/lib/supabase/server";
import { createTransactionSchema } from "@/schemas/transaction";

/**
 * GET /api/transactions
 * 거래 내역 목록 조회
 */
export async function GET(request: NextRequest) {
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

    // 사용자의 가구 조회
    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    // Query params 파싱
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as "buy" | "sell" | null;
    const ownerId = searchParams.get("ownerId");
    const ticker = searchParams.get("ticker");
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const filters: TransactionFilters = {};
    if (type) filters.type = type;
    if (ownerId) filters.ownerId = ownerId;
    if (ticker) filters.ticker = ticker;

    // 거래 내역 조회
    const result = await getTransactions(supabase, householdId, {
      filters,
      pagination: { page, pageSize },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Transaction list error:", error);
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

/**
 * POST /api/transactions
 * 거래 기록 생성
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
    const result = createTransactionSchema.safeParse(body);

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

    // 거래 생성
    const transaction = await createTransaction(supabase, {
      householdId,
      ownerId: user.id,
      ticker: input.ticker,
      type: input.type,
      quantity: input.quantity,
      price: input.price,
      transactedAt: input.transactedAt,
      memo: input.memo,
      accountId: input.accountId,
      stock: {
        name: input.stock.name,
        market: input.stock.market,
        currency: input.stock.currency,
        assetType: input.stock.assetType,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Transaction creation error:", error);
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
