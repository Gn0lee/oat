"use client";

import { useEffect, useState } from "react";

/**
 * 값의 변경을 지연시키는 훅
 * 검색 입력 등에서 과도한 API 호출 방지
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
