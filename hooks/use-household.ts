"use client";

import { useMutation } from "@tanstack/react-query";

interface UpdateHouseholdNameParams {
  householdId: string;
  name: string;
}

interface UpdateHouseholdNameResponse {
  data: {
    id: string;
    name: string;
  };
}

async function updateHouseholdName({
  householdId,
  name,
}: UpdateHouseholdNameParams): Promise<UpdateHouseholdNameResponse> {
  const response = await fetch(`/api/households/${householdId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "가구 이름 변경에 실패했습니다.");
  }

  return response.json();
}

export function useUpdateHouseholdName() {
  return useMutation({
    mutationFn: updateHouseholdName,
  });
}
