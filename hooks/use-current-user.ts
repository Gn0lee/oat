"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 클라이언트 컴포넌트에서 현재 로그인된 사용자 ID 조회
 */
export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setIsLoading(false);
    }

    fetchUser();
  }, []);

  return { userId, isLoading };
}
