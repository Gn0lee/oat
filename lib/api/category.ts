import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Category, CategoryType, Database } from "@/types";

export interface CreateCategoryParams {
  householdId: string;
  type: CategoryType;
  name: string;
  icon?: string | null;
}

export interface UpdateCategoryParams {
  name?: string;
  icon?: string | null;
}

export interface ReorderItem {
  id: string;
  displayOrder: number;
}

/**
 * 다음 display_order 값을 계산한다 (현재 최댓값 + 1).
 * 기존 순서가 없으면 0을 반환한다.
 */
export function nextDisplayOrder(existingOrders: number[]): number {
  if (existingOrders.length === 0) return 0;
  return Math.max(...existingOrders) + 1;
}

/**
 * reorder 요청의 ID가 모두 해당 가구 카테고리에 속하는지 검증한다.
 */
export function validateReorderIds(
  requestedIds: string[],
  householdCategoryIds: Set<string>,
): boolean {
  return requestedIds.every((id) => householdCategoryIds.has(id));
}

export async function getCategories(
  supabase: SupabaseClient<Database>,
  householdId: string,
  type?: CategoryType,
): Promise<Category[]> {
  let query = supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .order("display_order", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Categories fetch error:", error);
    throw new APIError("INTERNAL_ERROR", "카테고리 조회에 실패했습니다.", 500);
  }

  return data ?? [];
}

export async function createCategory(
  supabase: SupabaseClient<Database>,
  params: CreateCategoryParams,
): Promise<Category> {
  const { householdId, type, name, icon } = params;

  const { data: duplicate } = await supabase
    .from("categories")
    .select("id")
    .eq("household_id", householdId)
    .eq("type", type)
    .eq("name", name)
    .maybeSingle();

  if (duplicate) {
    throw new APIError(
      "CATEGORY_DUPLICATE_NAME",
      "이미 같은 이름의 카테고리가 있습니다.",
      400,
    );
  }

  const { data: existing } = await supabase
    .from("categories")
    .select("display_order")
    .eq("household_id", householdId)
    .eq("type", type);

  const orders = (existing ?? []).map((row) => row.display_order);
  const displayOrder = nextDisplayOrder(orders);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      household_id: householdId,
      type,
      name,
      icon: icon ?? null,
      display_order: displayOrder,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Category create error:", error);
    throw new APIError("INTERNAL_ERROR", "카테고리 생성에 실패했습니다.", 500);
  }

  return data;
}

export async function updateCategory(
  supabase: SupabaseClient<Database>,
  id: string,
  householdId: string,
  params: UpdateCategoryParams,
): Promise<Category> {
  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (fetchError) {
    console.error("Category fetch error:", fetchError);
    throw new APIError("INTERNAL_ERROR", "카테고리 조회에 실패했습니다.", 500);
  }

  if (!existing) {
    throw new APIError(
      "CATEGORY_NOT_FOUND",
      "카테고리를 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.is_system) {
    throw new APIError(
      "CATEGORY_SYSTEM_READONLY",
      "기본 제공 카테고리는 수정할 수 없습니다.",
      403,
    );
  }

  if (params.name && params.name !== existing.name) {
    const { data: duplicate } = await supabase
      .from("categories")
      .select("id")
      .eq("household_id", householdId)
      .eq("type", existing.type)
      .eq("name", params.name)
      .maybeSingle();

    if (duplicate) {
      throw new APIError(
        "CATEGORY_DUPLICATE_NAME",
        "이미 같은 이름의 카테고리가 있습니다.",
        400,
      );
    }
  }

  const { data, error } = await supabase
    .from("categories")
    .update({
      ...(params.name !== undefined && { name: params.name }),
      ...(params.icon !== undefined && { icon: params.icon }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Category update error:", error);
    throw new APIError("INTERNAL_ERROR", "카테고리 수정에 실패했습니다.", 500);
  }

  return data;
}

export async function deleteCategory(
  supabase: SupabaseClient<Database>,
  id: string,
  householdId: string,
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("id, is_system")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (fetchError) {
    console.error("Category fetch error:", fetchError);
    throw new APIError("INTERNAL_ERROR", "카테고리 조회에 실패했습니다.", 500);
  }

  if (!existing) {
    throw new APIError(
      "CATEGORY_NOT_FOUND",
      "카테고리를 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.is_system) {
    throw new APIError(
      "CATEGORY_SYSTEM_READONLY",
      "기본 제공 카테고리는 삭제할 수 없습니다.",
      403,
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("Category delete error:", error);
    throw new APIError("INTERNAL_ERROR", "카테고리 삭제에 실패했습니다.", 500);
  }
}

export async function reorderCategories(
  supabase: SupabaseClient<Database>,
  householdId: string,
  orders: ReorderItem[],
): Promise<void> {
  const requestedIds = orders.map((o) => o.id);

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("id")
    .eq("household_id", householdId)
    .in("id", requestedIds);

  if (fetchError) {
    console.error("Category fetch error:", fetchError);
    throw new APIError("INTERNAL_ERROR", "카테고리 조회에 실패했습니다.", 500);
  }

  const householdCategoryIds = new Set((existing ?? []).map((row) => row.id));

  if (!validateReorderIds(requestedIds, householdCategoryIds)) {
    throw new APIError(
      "CATEGORY_NOT_FOUND",
      "일부 카테고리를 찾을 수 없습니다.",
      404,
    );
  }

  for (const { id, displayOrder } of orders) {
    const { error } = await supabase
      .from("categories")
      .update({
        display_order: displayOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Category reorder error:", error);
      throw new APIError(
        "INTERNAL_ERROR",
        "카테고리 순서 변경에 실패했습니다.",
        500,
      );
    }
  }
}
