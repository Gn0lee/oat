import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  createRecordChangeRequest,
  listRecordChangeRequests,
} from "@/lib/api/record-change-requests";
import { createClient } from "@/lib/supabase/server";
import {
  createRecordChangeRequestSchema,
  listRecordChangeRequestsSchema,
} from "@/schemas/record-change-request";

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

    const result = listRecordChangeRequestsSchema.safeParse({
      box: request.nextUrl.searchParams.get("box") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const data = await listRecordChangeRequests(supabase, user.id, result.data);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Record change requests list error:", error);
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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const result = createRecordChangeRequestSchema.safeParse(body);

    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const data = await createRecordChangeRequest(
      supabase,
      user.id,
      result.data,
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Record change request creation error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
