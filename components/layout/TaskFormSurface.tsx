"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";

interface TaskFormSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  desktopClassName?: string;
  mobileContentClassName?: string;
}

export function TaskFormSurface({
  open,
  onOpenChange,
  title,
  description,
  children,
  desktopClassName,
  mobileContentClassName,
}: TaskFormSurfaceProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("sm:max-w-md", desktopClassName)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "h-[100dvh] max-h-[100dvh] rounded-none border-t-0 p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0",
          mobileContentClassName,
        )}
        showHandle={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4">
          <h2 className="min-w-0 truncate text-base font-semibold text-gray-900">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            aria-label="닫기"
            onClick={() => onOpenChange(false)}
            className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
          >
            <XIcon className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
          {description ? (
            <div className="text-sm text-gray-500">{description}</div>
          ) : null}
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
