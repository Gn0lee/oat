"use client";

import { Ssgoi } from "@ssgoi/react";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { createPageTransitionConfig } from "@/lib/transitions/create-page-transition-config";
import { getPageTransitionMode } from "@/lib/transitions/page-transition-rules";

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export function PageTransitionProvider({
  children,
}: PageTransitionProviderProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const mode = getPageTransitionMode({
    hasMounted,
    isDesktop,
    prefersReducedMotion,
  });

  const config = useMemo(() => createPageTransitionConfig(mode), [mode]);

  return <Ssgoi config={config}>{children}</Ssgoi>;
}
