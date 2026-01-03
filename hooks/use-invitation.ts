"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Invitation } from "@/types";

interface InvitationResponse {
  data: Invitation | null;
}

interface InvitationError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchInvitation(): Promise<Invitation | null> {
  const response = await fetch("/api/invitations");
  const json = await response.json();

  if (!response.ok) {
    const error = json as InvitationError;
    throw new Error(error.error.message);
  }

  return (json as InvitationResponse).data;
}

interface CreateInvitationOptions {
  regenerate?: boolean;
}

async function createInvitation(
  options?: CreateInvitationOptions,
): Promise<Invitation> {
  const response = await fetch("/api/invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ regenerate: options?.regenerate ?? false }),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as InvitationError;
    throw new Error(error.error.message);
  }

  return (json as InvitationResponse).data as Invitation;
}

export function useInvitation() {
  return useQuery({
    queryKey: ["invitation"],
    queryFn: fetchInvitation,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: CreateInvitationOptions) =>
      createInvitation(options),
    onSuccess: (data) => {
      queryClient.setQueryData(["invitation"], data);
    },
  });
}

interface AcceptInvitationResponse {
  data: { householdId: string };
}

async function acceptInvitation(
  code: string,
): Promise<{ householdId: string }> {
  const normalizedCode = code.toUpperCase().replace(/-/g, "");
  const response = await fetch(`/api/invitations/${normalizedCode}/accept`, {
    method: "POST",
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as InvitationError;
    throw new Error(error.error.message);
  }

  return (json as AcceptInvitationResponse).data;
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      // 초대 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["invitation"] });
    },
  });
}
