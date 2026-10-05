"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiQueryError, fetchApiData } from "@/lib/api/client";
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
    const error = (json as ApiErrorResponse).error;
    throw new ApiQueryError(
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "요청에 실패했습니다.",
      response.status,
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

// 승인된 장부 이동은 옛·새 장부와 전체 범위를 함께 바꾸므로 장부 단위가 아닌 전체 키를 무효화한다.
export function invalidateRecordChangeRequestQueries(
  queryClient: QueryClient,
  options: { recordsChanged?: boolean } = {},
) {
  queryClient.invalidateQueries({
    queryKey: queries.recordChangeRequests._def,
  });
  queryClient.invalidateQueries({ queryKey: queries.notifications._def });
  if (!options.recordsChanged) return;
  queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] });
  queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
  queryClient.invalidateQueries({ queryKey: queries.ledgerStats._def });
  queryClient.invalidateQueries({ queryKey: queries.home._def });
  queryClient.invalidateQueries({ queryKey: queries.accounts._def });
  queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
  queryClient.invalidateQueries({ queryKey: queries.transactions._def });
  queryClient.invalidateQueries({ queryKey: queries.holdings._def });
  queryClient.invalidateQueries({ queryKey: queries.dashboard._def });
}

export function useRecordChangeRequest(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queries.recordChangeRequests.detail(id).queryKey,
    queryFn: async () => {
      const request = await fetchApiData<RecordChangeRequest>(
        `/api/record-change-requests/${id}`,
      );
      void queryClient.invalidateQueries({
        queryKey: queries.notifications._def,
      });
      return request;
    },
  });
}

export function useCreateRecordChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecordChangeRequest,
    onSettled: () => invalidateRecordChangeRequestQueries(queryClient),
  });
}

export function useCancelRecordChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelRecordChangeRequest,
    // 409(이미 처리됨)여도 현재 상태를 다시 읽는다.
    onSettled: () => invalidateRecordChangeRequestQueries(queryClient),
  });
}

export function useResolveRecordChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveRecordChangeRequest,
    // 만료(409)도 요청 상태가 바뀐 결과이므로 성공과 같이 다시 읽는다.
    onSettled: () =>
      invalidateRecordChangeRequestQueries(queryClient, {
        recordsChanged: true,
      }),
  });
}
