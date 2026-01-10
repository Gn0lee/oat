import { NextResponse } from "next/server";
import { deleteAccount, updateAccount } from "@/lib/api/account";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { createClient } from "@/lib/supabase/server";
import { updateAccountSchema } from "@/schemas/account";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/accounts/[id]
 * 계좌 수정
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const result = updateAccountSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const input = result.data;

    // 계좌 수정 (소유권 확인은 updateAccount 내부에서 처리)
    const account = await updateAccount(supabase, id, user.id, {
      name: input.name,
      broker: input.broker,
      accountNumber: input.accountNumber,
      accountType: input.accountType,
      isDefault: input.isDefault,
      memo: input.memo,
    });

    return NextResponse.json({ data: account });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Account update error:", error);
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
 * DELETE /api/accounts/[id]
 * 계좌 삭제
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 계좌 삭제 (소유권 확인은 deleteAccount 내부에서 처리)
    await deleteAccount(supabase, id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Account delete error:", error);
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
