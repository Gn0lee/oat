"use client";

import { useEffect, useRef } from "react";
import { COMPOSER_BACK_EVENT } from "./composer-events";

/** 헤더 뒤로가기 이벤트를 구독한다. handler는 항상 최신 값을 호출한다. */
export function useComposerBack(handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const handleBack = () => handlerRef.current();
    window.addEventListener(COMPOSER_BACK_EVENT, handleBack);
    return () => window.removeEventListener(COMPOSER_BACK_EVENT, handleBack);
  }, [enabled]);
}
