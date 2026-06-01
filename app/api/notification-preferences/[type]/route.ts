import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  assertKnownNotificationType,
  upsertNotificationPreference,
} from "@/lib/api/notifications";
import { notificationPreferenceUpdateSchema } from "@/lib/notifications/schema";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    type: string;
  }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const { type: typeParam } = await params;
    const type = assertKnownNotificationType(typeParam);
    const body = await request.json();
    const result = notificationPreferenceUpdateSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new APIError(
        "VALIDATION_ERROR",
        firstError?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }

    const preference = await upsertNotificationPreference(
      supabase,
      user.id,
      type,
      result.data,
    );

    return NextResponse.json({ data: preference });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Notification preference update error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
