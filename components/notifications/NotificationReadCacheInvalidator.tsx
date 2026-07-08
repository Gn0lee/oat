"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queries } from "@/lib/queries/keys";

export function NotificationReadCacheInvalidator() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: queries.notifications._def,
    });
  }, [queryClient]);

  return null;
}
