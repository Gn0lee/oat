"use client";

import { useCallback, useRef } from "react";

/** 저장 요청 멱등 키. payload가 이전 요청과 같으면 같은 키를 재사용한다. */
export function useIdempotentRequestId() {
  const requestRef = useRef<{ signature: string; requestId: string } | null>(
    null,
  );
  return useCallback((payload: unknown) => {
    const signature = JSON.stringify(payload);
    if (!requestRef.current || requestRef.current.signature !== signature) {
      requestRef.current = { signature, requestId: crypto.randomUUID() };
    }
    return requestRef.current.requestId;
  }, []);
}
