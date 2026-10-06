"use client";

import { useCallback, useRef } from "react";

export type ReviewEditContext = { clientId?: string; fromReview?: boolean };

interface UseReviewEditNavigationOptions<
  TStep extends string,
  TFunnelStep extends string,
> {
  /** 도메인 단계 → 퍼널 단계 이름 */
  steps: Record<TStep, TFunnelStep>;
  reviewStep: TFunnelStep;
  push: (step: TFunnelStep, context: ReviewEditContext) => void;
}

/**
 * 검토 화면에서 특정 행의 단계로 들어갔다가, 단계를 마치면 다음 누락 단계나
 * 검토로 돌아가게 한다. 검토로 돌아오면 원래 누른 위치로 포커스를 돌려준다.
 */
export function useReviewEditNavigation<
  TStep extends string,
  TFunnelStep extends string,
>({
  steps,
  reviewStep,
  push,
}: UseReviewEditNavigationOptions<TStep, TFunnelStep>) {
  const focusIdRef = useRef<string | undefined>(undefined);
  const clearFocus = useCallback(() => {
    focusIdRef.current = undefined;
  }, []);

  /** 행의 단계로 들어간다. step이 없으면 검토로 간다. */
  const openStep = (step: TStep | null | undefined, clientId?: string) => {
    if (!step) return push(reviewStep, {});
    return push(steps[step], { clientId, fromReview: true });
  };

  /** 검토 화면의 값을 눌러 그 행의 단계로 들어간다. */
  const editFromReview = (clientId: string, step: TStep, anchorId: string) => {
    focusIdRef.current = anchorId;
    openStep(step, clientId);
  };

  return {
    focusId: focusIdRef.current,
    clearFocus,
    openStep,
    editFromReview,
  };
}
