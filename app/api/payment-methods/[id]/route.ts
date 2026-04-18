import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  deletePaymentMethod,
  updatePaymentMethod,
} from "@/lib/api/payment-method";
import { createClient } from "@/lib/supabase/server";
import { updatePaymentMethodSchema } from "@/schemas/payment-method";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/payment-methods/[id]
 * 결제수단 수정
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
    const result = updatePaymentMethodSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const input = result.data;

    const paymentMethod = await updatePaymentMethod(supabase, id, user.id, {
      name: input.name,
      type: input.type,
      linkedAccountId: input.linkedAccountId,
      issuer: input.issuer,
      lastFour: input.lastFour,
      paymentDay: input.paymentDay,
      isDefault: input.isDefault,
      memo: input.memo,
    });

    return NextResponse.json({ data: paymentMethod });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Payment method update error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/payment-methods/[id]
 * 결제수단 삭제
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

    await deletePaymentMethod(supabase, id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Payment method delete error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
