"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { Category, CategoryType } from "@/types";

interface CategoryListResponse {
  data: Category[];
}

interface CategorySingleResponse {
  data: Category;
}

interface CategoryError {
  error: {
    code: string;
    message: string;
  };
}

// ─── fetch 함수 ───

async function fetchCategories(type?: CategoryType): Promise<Category[]> {
  const url = type ? `/api/categories?type=${type}` : "/api/categories";
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    const error = json as CategoryError;
    throw new Error(error.error.message);
  }

  return (json as CategoryListResponse).data;
}

async function createCategoryFn(params: {
  type: CategoryType;
  name: string;
  icon?: string | null;
}): Promise<Category> {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as CategoryError;
    throw new Error(error.error.message);
  }

  return (json as CategorySingleResponse).data;
}

async function updateCategoryFn(params: {
  id: string;
  name?: string;
  icon?: string | null;
}): Promise<Category> {
  const { id, ...body } = params;
  const response = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as CategoryError;
    throw new Error(error.error.message);
  }

  return (json as CategorySingleResponse).data;
}

async function deleteCategoryFn(id: string): Promise<void> {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const json = await response.json();
    const error = json as CategoryError;
    throw new Error(error.error.message);
  }
}

async function reorderCategoriesFn(
  orders: { id: string; displayOrder: number }[],
): Promise<void> {
  const response = await fetch("/api/categories/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders }),
  });

  if (!response.ok) {
    const json = await response.json();
    const error = json as CategoryError;
    throw new Error(error.error.message);
  }
}

// ─── Query 훅 ───

export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: queries.categories.list(type).queryKey,
    queryFn: () => fetchCategories(type),
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Mutation 훅 ───

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queries.categories._def,
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategoryFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queries.categories._def,
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategoryFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queries.categories._def,
      });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderCategoriesFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queries.categories._def,
      });
    },
  });
}
