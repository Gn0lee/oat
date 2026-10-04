import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  deleteLedgerBook,
  getLedgerBook,
  renameLedgerBook,
  validateLedgerBookId,
} from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";
import { renameLedgerBookSchema } from "@/schemas/ledger-book";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
  return { supabase, householdId };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    validateLedgerBookId(id);
    const { supabase, householdId } = await getContext();
    const book = await getLedgerBook(supabase, householdId, id);
    return NextResponse.json({ data: book });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    validateLedgerBookId(id);
    const { supabase, householdId } = await getContext();
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
    const result = renameLedgerBookSchema.safeParse(body);
    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "유효하지 않은 요청입니다.",
        400,
      );
    }
    const book = await renameLedgerBook(
      supabase,
      householdId,
      id,
      result.data.name,
    );
    return NextResponse.json({ data: book });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    validateLedgerBookId(id);
    const { supabase, householdId } = await getContext();
    await deleteLedgerBook(supabase, householdId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
