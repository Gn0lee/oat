import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createLedgerBook, getLedgerBookList } from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";
import { createLedgerBookSchema } from "@/schemas/ledger-book";

function errorResponse(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json(toErrorResponse(error), {
      status: error.statusCode,
    });
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } },
    { status: 500 },
  );
}

async function getContext() {
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
  return { supabase, user, householdId };
}

export async function GET() {
  try {
    const { supabase, householdId } = await getContext();
    const books = await getLedgerBookList(supabase, householdId);
    return NextResponse.json({ data: books });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, householdId } = await getContext();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new APIError(
        "VALIDATION_ERROR",
        "요청 본문이 올바르지 않습니다.",
        400,
      );
    }
    const result = createLedgerBookSchema.safeParse(body);
    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }
    const book = await createLedgerBook(supabase, {
      householdId,
      userId: user.id,
      name: result.data.name,
      visibility: result.data.visibility,
    });
    return NextResponse.json({ data: book }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
