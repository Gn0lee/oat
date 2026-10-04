"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function ComposerActionBar({
  label,
  disabled = false,
  onClick,
  backLabel,
  onBack,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  backLabel?: string;
  onBack?: () => void;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setPortalRoot(document.body), []);
  if (!portalRoot) return null;
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t bg-background/95 px-4 pt-3 pb-3 backdrop-blur lg:hidden">
      {backLabel && onBack && (
        <Button
          type="button"
          variant="outline"
          className="min-h-12 flex-1"
          onClick={onBack}
        >
          {backLabel}
        </Button>
      )}
      <Button
        type="button"
        className="min-h-12 flex-1 text-base"
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </Button>
    </div>,
    portalRoot,
  );
}
