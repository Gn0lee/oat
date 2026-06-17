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
        <Button
          type="button"
          variant="ghost"
          aria-label="닫기"
          onClick={() => onOpenChange(false)}
          className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
        >
          <XIcon className="size-5" />
        </Button>

        <div className="flex-1 overflow-y-auto px-4 pt-16 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {description ? (
              <div className="text-sm text-gray-500">{description}</div>
            ) : null}
          </div>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
