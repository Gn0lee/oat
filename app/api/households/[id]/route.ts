import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { updateHouseholdName } from "@/lib/api/household";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateHouseholdSchema = z.object({
  name: z
    .string()
    .min(1, "가구 이름을 입력해주세요.")
    .max(50, "가구 이름은 50자 이하로 입력해주세요."),
});

/**
 * PATCH /api/households/[id]
 * 가구 정보 수정 (현재는 이름만)
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

    // 요청 바디 파싱 및 검증
    const body = await request.json();
    const parsed = updateHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        parsed.error.issues[0].message,
        400,
      );
    }

    // 가구 이름 수정
    const result = await updateHouseholdName(
      supabase,
      id,
      user.id,
      parsed.data.name,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "HOUSEHOLD_ERROR",
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    console.error("Household update error:", error);
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
