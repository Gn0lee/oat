import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { resolveRecordChangeRequest } from "@/lib/api/record-change-requests";
import { createClient } from "@/lib/supabase/server";
import { resolveRecordChangeRequestSchema } from "@/schemas/record-change-request";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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
    const result = resolveRecordChangeRequestSchema.safeParse(body);

    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const data = await resolveRecordChangeRequest(
      supabase,
      user.id,
      id,
      result.data,
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Record change request resolve error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
