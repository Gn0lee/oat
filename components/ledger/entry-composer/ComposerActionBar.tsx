"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function ComposerActionBar({
  label,
  disabled = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setPortalRoot(document.body), []);
  if (!portalRoot) return null;
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex border-t border-border bg-background px-4 pt-3 pb-3 md:hidden">
      <Button
        type="button"
        className="min-h-12 w-full rounded-[12px] text-base"
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </Button>
    </div>,
    portalRoot,
  );
}
