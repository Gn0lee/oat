"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  COMPOSER_CLOSE_EVENT,
  type ComposerEventDetail,
} from "./composer-events";

interface UseComposerExitGuardOptions {
  /** history sentinel 키 접두사 */
  sentinelPrefix: string;
  /** use-funnel id. 저장 후 퍼널이 쌓은 history만큼 되돌아갈 때 쓴다. */
  funnelId: string;
  /** 닫기·이탈 시 기본 목적지 */
  origin: string;
  isDirty: boolean;
  /** 컴포저가 실제로 입력 가능한 상태일 때만 history sentinel을 쌓는다. */
  isActive: boolean;
  /** 브라우저 뒤로가기로 이탈 확인을 띄울 때, 취소 후 포커스를 돌려줄 요소 */
  getPopFocusTarget?: () => HTMLElement | null;
}

/**
 * 이탈 확인, history sentinel·popstate 가드, 헤더 닫기 이벤트,
 * 내부 링크 가로채기, 저장 후 이탈을 묶는다.
 */
export function useComposerExitGuard({
  sentinelPrefix,
  funnelId,
  origin,
  isDirty,
  isActive,
  getPopFocusTarget,
}: UseComposerExitGuardOptions) {
  const router = useRouter();
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const completedRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const exitFocusRef = useRef<HTMLElement | null>(null);
  const popFocusRef = useRef(getPopFocusTarget);
  dirtyRef.current = isDirty;
  popFocusRef.current = getPopFocusTarget;

  const requestExit = useCallback(
    (target = origin, trigger?: HTMLElement | null) => {
      exitFocusRef.current =
        trigger ?? (document.activeElement as HTMLElement | null);
      if (dirtyRef.current) setPendingExit(target);
      else router.push(target);
    },
    [router, origin],
  );

  useEffect(() => {
    const handleClose = (event: Event) =>
      requestExit(
        origin,
        (event as CustomEvent<ComposerEventDetail>).detail?.trigger,
      );
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = new URL(anchor.href, window.location.origin);
      if (
        href.origin !== window.location.origin ||
        completedRef.current ||
        href.pathname === window.location.pathname
      )
        return;
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      exitFocusRef.current = anchor;
      setPendingExit(`${href.pathname}${href.search}${href.hash}`);
    };
    window.addEventListener(COMPOSER_CLOSE_EVENT, handleClose);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener(COMPOSER_CLOSE_EVENT, handleClose);
      document.removeEventListener("click", handleClick, true);
    };
  }, [requestExit, origin]);

  const sentinelRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isActive) return;
    // Push once per composer mount; StrictMode and dependency changes only rebind the listener.
    if (!sentinelRef.current) {
      sentinelRef.current = `${sentinelPrefix}-${crypto.randomUUID()}`;
      window.history.pushState(
        { ...window.history.state, [sentinelRef.current]: true },
        "",
        window.location.href,
      );
    }
    const sentinel = sentinelRef.current;
    const handlePopState = (event: PopStateEvent) => {
      if (completedRef.current) {
        const destination = completedRef.current;
        completedRef.current = null;
        router.replace(destination);
        return;
      }
      if (!event.state?.[sentinel]) {
        if (!dirtyRef.current) return;
        window.history.pushState(
          { ...window.history.state, [sentinel]: true },
          "",
          window.location.href,
        );
        exitFocusRef.current = popFocusRef.current?.() ?? null;
        setPendingExit(origin);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isActive, sentinelPrefix, router, origin]);

  /** 저장 성공 후 퍼널과 sentinel history를 걷어내고 target으로 이동한다. */
  const leaveAfterSave = useCallback(
    (target: string) => {
      completedRef.current = target;
      const entryCount =
        (
          window.history.state?.[`${funnelId}.histories`] as
            | unknown[]
            | undefined
        )?.length ?? 1;
      window.history.go(-(entryCount + 1));
      // If the landing entry is not the pre-composer one, popstate still fires; this covers a missed pop.
      window.setTimeout(() => {
        if (completedRef.current !== target) return;
        completedRef.current = null;
        router.replace(target);
      }, 1000);
    },
    [funnelId, router],
  );

  const cancelExit = useCallback(() => {
    setPendingExit(null);
    requestAnimationFrame(() => exitFocusRef.current?.focus());
  }, []);

  const confirmExit = useCallback(() => {
    const destination = pendingExit ?? origin;
    setPendingExit(null);
    router.push(destination);
  }, [pendingExit, origin, router]);

  return {
    requestExit,
    leaveAfterSave,
    exitDialog: {
      open: Boolean(pendingExit),
      onCancel: cancelExit,
      onConfirm: confirmExit,
      focusRef: exitFocusRef,
    },
  };
}
