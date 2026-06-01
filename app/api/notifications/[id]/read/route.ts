import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { markNotificationAsRead } from "@/lib/api/notifications";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const { id } = await params;
    const notification = await markNotificationAsRead(supabase, user.id, id);

    return NextResponse.json({ data: notification });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Notification read error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
