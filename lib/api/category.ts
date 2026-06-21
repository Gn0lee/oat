import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Category, CategoryType, Database } from "@/types";

export interface CreateCategoryParams {
  householdId: string;
  type: CategoryType;
  name: string;
  icon?: string | null;
  parentId?: string | null;
}

export interface UpdateCategoryParams {
  name?: string;
  icon?: string | null;
}

export interface ReorderItem {
  id: string;
  displayOrder: number;
}

interface CategorySiblingRow {
  id: string;
  parent_id: string | null;
}

interface CategoryNameRow extends CategorySiblingRow {
  name: string;
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

export function validateReorderSiblingSet(
  rows: CategorySiblingRow[],
  parentId: string | null,
): boolean {
  return rows.every((row) => row.parent_id === parentId);
}

export function isDuplicateCategoryName(
  rows: CategoryNameRow[],
  input: { name: string; parentId?: string | null; excludeId?: string },
): boolean {
  const parentId = input.parentId ?? null;
  const nextName = input.name.trim().toLocaleLowerCase("ko-KR");
  return rows.some(
    (row) =>
      row.id !== input.excludeId &&
      row.parent_id === parentId &&
      row.name.trim().toLocaleLowerCase("ko-KR") === nextName,
  );
}

export function categoryLabel(category: {
  name: string;
  parent?: { name: string | null } | null;
}): string {
  return category.parent?.name
    ? `${category.parent.name} > ${category.name}`
    : category.name;
}

function applyParentFilter<
  T extends {
    is: (column: string, value: null) => T;
    eq: (column: string, value: string) => T;
  },
>(query: T, parentId?: string | null): T {
  return parentId
    ? query.eq("parent_id", parentId)
    : query.is("parent_id", null);
}

export async function getCategories(
  supabase: SupabaseClient<Database>,
  householdId: string,
  type?: CategoryType,
  parentId?: string | null,
): Promise<Category[]> {
  let query = supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .order("display_order", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  if (parentId !== undefined) {
    query = applyParentFilter(query, parentId);
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
  const { householdId, type, name, icon, parentId = null } = params;

  let parent: Category | null = null;
  if (parentId) {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", parentId)
      .eq("household_id", householdId)
      .eq("type", type)
      .is("parent_id", null)
      .maybeSingle();

    if (error) {
      console.error("Parent category fetch error:", error);
      throw new APIError(
        "INTERNAL_ERROR",
        "상위 카테고리 조회에 실패했습니다.",
        500,
      );
    }
    if (!data) {
      throw new APIError(
        "CATEGORY_PARENT_INVALID",
        "상위 카테고리를 찾을 수 없습니다.",
        400,
      );
    }
    if (
      data.name.trim().toLocaleLowerCase("ko-KR") ===
      name.trim().toLocaleLowerCase("ko-KR")
    ) {
      throw new APIError(
        "CATEGORY_DUPLICATE_NAME",
        "상위 카테고리와 같은 이름은 사용할 수 없습니다.",
        400,
      );
    }
    parent = data;
  }

  let duplicateQuery = supabase
    .from("categories")
    .select("id")
    .eq("household_id", householdId)
    .eq("type", type)
    .eq("name", name);
  duplicateQuery = applyParentFilter(duplicateQuery, parentId);
  const { data: duplicate } = await duplicateQuery.maybeSingle();

  if (duplicate) {
    throw new APIError(
      "CATEGORY_DUPLICATE_NAME",
      "이미 같은 이름의 카테고리가 있습니다.",
      400,
    );
  }

  let existingQuery = supabase
    .from("categories")
    .select("display_order")
    .eq("household_id", householdId)
    .eq("type", type);
  existingQuery = applyParentFilter(existingQuery, parentId);
  const { data: existing } = await existingQuery;

  const orders = (existing ?? []).map((row) => row.display_order);
  const displayOrder = nextDisplayOrder(orders);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      household_id: householdId,
      type,
      name,
      icon: icon ?? null,
      parent_id: parent?.id ?? null,
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
    if (
      existing.parent_id &&
      params.name.trim().toLocaleLowerCase("ko-KR") ===
        (
          await supabase
            .from("categories")
            .select("name")
            .eq("id", existing.parent_id)
            .maybeSingle()
        ).data?.name
          ?.trim()
          .toLocaleLowerCase("ko-KR")
    ) {
      throw new APIError(
        "CATEGORY_DUPLICATE_NAME",
        "상위 카테고리와 같은 이름은 사용할 수 없습니다.",
        400,
      );
    }

    let duplicateQuery = supabase
      .from("categories")
      .select("id")
      .eq("household_id", householdId)
      .eq("type", existing.type)
      .eq("name", params.name)
      .neq("id", id);
    duplicateQuery = applyParentFilter(duplicateQuery, existing.parent_id);
    const { data: duplicate } = await duplicateQuery.maybeSingle();

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

  const { data: children, error: childFetchError } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", id)
    .limit(1);

  if (childFetchError) {
    console.error("Category children fetch error:", childFetchError);
    throw new APIError(
      "INTERNAL_ERROR",
      "하위 카테고리 조회에 실패했습니다.",
      500,
    );
  }

  if ((children ?? []).length > 0) {
    throw new APIError(
      "CATEGORY_HAS_CHILDREN",
      "세부 카테고리가 있는 카테고리는 삭제할 수 없습니다.",
      400,
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
  parentId: string | null = null,
): Promise<void> {
  const requestedIds = orders.map((o) => o.id);

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("id, parent_id")
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

  if (!validateReorderSiblingSet(existing ?? [], parentId)) {
    throw new APIError(
      "CATEGORY_REORDER_MIXED_SIBLINGS",
      "같은 단계의 카테고리만 순서를 변경할 수 있습니다.",
      400,
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
