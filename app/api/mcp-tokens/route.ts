import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  createMcpToken,
  DEFAULT_MCP_READ_SCOPES,
  listMcpTokens,
} from "@/lib/mcp/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createMcpTokenSchema = z.object({
  name: z
    .string()
    .min(1, "토큰 이름을 입력해주세요.")
    .max(80, "토큰 이름은 80자 이내여야 합니다."),
});

async function getAuthenticatedMcpContext() {
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

  return { userId: user.id, householdId };
}

export async function GET() {
  try {
    const { userId, householdId } = await getAuthenticatedMcpContext();
    const admin = createAdminClient();
    const tokens = await listMcpTokens(admin, userId, householdId);

    return NextResponse.json({ data: tokens });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("MCP token list route error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, householdId } = await getAuthenticatedMcpContext();
    const body = await request.json();
    const parsed = createMcpTokenSchema.safeParse(body);

    if (!parsed.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const admin = createAdminClient();
    const result = await createMcpToken(admin, {
      userId,
      householdId,
      name: parsed.data.name,
      scopes: [...DEFAULT_MCP_READ_SCOPES],
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("MCP token create route error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
