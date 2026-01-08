"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Invitation } from "@/types";

interface InvitationsResponse {
  data: Invitation[];
}

interface InvitationResponse {
  data: Invitation;
}

interface InvitationError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * 발송된 초대 목록 조회
 */
async function fetchInvitations(): Promise<Invitation[]> {
  const response = await fetch("/api/invitations");
  const json = await response.json();

  if (!response.ok) {
    const error = json as InvitationError;
    throw new Error(error.error.message);
  }

  return (json as InvitationsResponse).data;
}

/**
 * 이메일로 초대 발송
 */
async function sendEmailInvitation(email: string): Promise<Invitation> {
  const response = await fetch("/api/invitations/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as InvitationError;
    throw new Error(error.error.message);
  }

  return (json as InvitationResponse).data;
}

/**
 * 초대 취소
 */
async function cancelInvitation(id: string): Promise<void> {
  const response = await fetch(`/api/invitations/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const json = await response.json();
    const error = json as InvitationError;
    throw new Error(error.error.message);
  }
}

/**
 * 발송된 초대 목록 조회 hook
 */
export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: fetchInvitations,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 이메일 초대 발송 mutation
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendEmailInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

/**
 * 초대 취소 mutation
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}
