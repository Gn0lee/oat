import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { upsertNotificationPreferences } from "@/lib/api/notifications";
import { notificationPreferenceBatchUpdateSchema } from "@/lib/notifications/schema";
import { createClient } from "@/lib/supabase/server";

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
    const result = notificationPreferenceBatchUpdateSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const preferences = await upsertNotificationPreferences(
      supabase,
      user.id,
      result.data.updates,
    );

    return NextResponse.json({ data: preferences });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Notification preference batch update error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
