import { NextResponse } from "next/server";
import { reorderCategories } from "@/lib/api/category";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";
import { reorderCategoriesSchema } from "@/schemas/category";

/**
 * PATCH /api/categories/reorder
 * 카테고리 순서 변경 (display_order 배치 업데이트)
 *
 * Body: { orders: [{ id: string, displayOrder: number }] }
 */
export async function PATCH(request: Request) {
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
    const result = reorderCategoriesSchema.safeParse(body);

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

    await reorderCategories(
      supabase,
      householdId,
      result.data.orders.map((o) => ({
        id: o.id,
        displayOrder: o.displayOrder,
      })),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Category reorder error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
