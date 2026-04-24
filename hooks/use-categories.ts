"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { Category, CategoryType } from "@/types";

interface CategoryListResponse {
  data: Category[];
}

interface CategoryError {
  error: {
    code: string;
    message: string;
  };
}

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

export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: queries.categories.list(type).queryKey,
    queryFn: () => fetchCategories(type),
    staleTime: 1000 * 60 * 5,
  });
}
