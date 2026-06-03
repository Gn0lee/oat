"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApiData } from "@/lib/api/client";
import { queries } from "@/lib/queries/keys";
import type {
  CreateRecordChangeRequestInput,
  ResolveRecordChangeRequestInput,
} from "@/schemas/record-change-request";
import type { RecordChangeRequest } from "@/types";

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

async function readApiJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiDataResponse<T> | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      (json as ApiErrorResponse).error?.message ?? "요청에 실패했습니다.",
    );
  }

  return (json as ApiDataResponse<T>).data;
}

async function createRecordChangeRequest(
  input: CreateRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  const response = await fetch("/api/record-change-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readApiJson<RecordChangeRequest>(response);
}

async function cancelRecordChangeRequest(
  id: string,
): Promise<RecordChangeRequest> {
  const response = await fetch(`/api/record-change-requests/${id}/cancel`, {
    method: "POST",
  });

  return readApiJson<RecordChangeRequest>(response);
}

async function resolveRecordChangeRequest({
  id,
  data,
}: {
  id: string;
  data: ResolveRecordChangeRequestInput;
}): Promise<RecordChangeRequest> {
  const response = await fetch(`/api/record-change-requests/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return readApiJson<RecordChangeRequest>(response);
}

export function useRecordChangeRequest(id: string) {
  return useQuery({
    queryKey: queries.recordChangeRequests.detail(id).queryKey,
    queryFn: () =>
      fetchApiData<RecordChangeRequest>(`/api/record-change-requests/${id}`),
  });
}

export function useCreateRecordChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecordChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queries.recordChangeRequests._def,
      });
      queryClient.invalidateQueries({ queryKey: queries.notifications._def });
    },
  });
}

export function useCancelRecordChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelRecordChangeRequest,
    onSuccess: (request) => {
      queryClient.invalidateQueries({
        queryKey: queries.recordChangeRequests._def,
      });
      queryClient.invalidateQueries({
        queryKey: queries.recordChangeRequests.detail(request.id).queryKey,
      });
    },
  });
}

export function useResolveRecordChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveRecordChangeRequest,
    onSuccess: (request) => {
      queryClient.invalidateQueries({
        queryKey: queries.recordChangeRequests._def,
      });
      queryClient.invalidateQueries({
        queryKey: queries.recordChangeRequests.detail(request.id).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
      queryClient.invalidateQueries({ queryKey: queries.accounts._def });
      queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
      queryClient.invalidateQueries({ queryKey: queries.transactions._def });
      queryClient.invalidateQueries({ queryKey: queries.holdings._def });
      queryClient.invalidateQueries({ queryKey: queries.dashboard._def });
    },
  });
}
