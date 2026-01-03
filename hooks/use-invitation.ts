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

async function createInvitation(): Promise<Invitation> {
  const response = await fetch("/api/invitations", {
    method: "POST",
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
    mutationFn: createInvitation,
    onSuccess: (data) => {
      queryClient.setQueryData(["invitation"], data);
    },
  });
}
