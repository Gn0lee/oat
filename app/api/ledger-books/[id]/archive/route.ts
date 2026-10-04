import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  archiveLedgerBook,
  validateLedgerBookId,
} from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    validateLedgerBookId(id);
    if ((await request.text()).trim())
      throw new APIError(
        "VALIDATION_ERROR",
        "요청 본문을 보낼 수 없습니다.",
        400,
      );

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user)
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    const householdId = await getUserHouseholdId(supabase, user.id);
    if (!householdId)
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );

    const book = await archiveLedgerBook(supabase, householdId, id);
    return NextResponse.json({ data: book });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
