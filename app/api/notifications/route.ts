import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  decodeNotificationCursor,
  getNotifications,
  normalizeNotificationLimit,
} from "@/lib/api/notifications";
import { createClient } from "@/lib/supabase/server";

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

    const { searchParams } = request.nextUrl;
    const cursor = decodeNotificationCursor(searchParams.get("cursor"));
    const limit = normalizeNotificationLimit(searchParams.get("limit"));

    const result = await getNotifications(supabase, user.id, {
      cursor,
      limit,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Notifications list error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
