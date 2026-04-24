import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createCategory, getCategories } from "@/lib/api/category";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";
import { createCategorySchema } from "@/schemas/category";
import type { CategoryType } from "@/types";

/**
 * GET /api/categories
 * 카테고리 목록 조회
 *
 * Query params:
 *   ?type=expense   → 지출 카테고리만
 *   ?type=income    → 수입 카테고리만
 *   (없음)          → 전체
 */
export async function GET(request: NextRequest) {
  try {
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

    const typeParam = request.nextUrl.searchParams.get("type");
    const type =
      typeParam === "expense" || typeParam === "income"
        ? (typeParam as CategoryType)
        : undefined;

    const categories = await getCategories(supabase, householdId, type);

    return NextResponse.json({ data: categories });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Categories list error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/categories
 * 커스텀 카테고리 생성
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
    const result = createCategorySchema.safeParse(body);

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

    const category = await createCategory(supabase, {
      householdId,
      type: result.data.type,
      name: result.data.name,
      icon: result.data.icon,
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Category create error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
