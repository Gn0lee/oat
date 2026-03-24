"use client";

import { Download, Plus, Share } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const isModeStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    setIsStandalone(isModeStandalone);

    if (isModeStandalone) {
      return;
    }

    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed-at");

    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      } else {
        localStorage.removeItem("pwa-prompt-dismissed-at");
      }
    }

    const isDeviceIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isDeviceIOS);

    const isDeviceAndroid = /android/i.test(navigator.userAgent);
    setIsAndroid(isDeviceAndroid);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      clearTimeout(timer);
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsVisible(open);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-prompt-dismissed-at", Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setIsVisible(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (!isMounted || isStandalone) {
    return null;
  }

  const shouldShow = isIOS || isAndroid || deferredPrompt;

  return (
    <Dialog open={isVisible && !!shouldShow} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md w-[85%] sm:w-full rounded-[2rem] p-6 text-center flex flex-col items-center">
        <DialogHeader className="flex flex-col items-center mb-2">
          <div className="w-20 h-20 bg-primary/5 rounded-[1.5rem] flex items-center justify-center p-3 shadow-inner border border-primary/10 mb-4">
            <Image
              src="/apple-touch-icon.png"
              alt="App Logo"
              width={56}
              height={56}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <DialogTitle className="text-xl">Oat 앱 설치하기</DialogTitle>
          <DialogDescription className="text-center pt-2">
            홈 화면에 추가하여
            <br />
            빠르고 편리하게 사용해보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full">
          {isIOS ? (
            <div className="bg-muted/50 rounded-2xl p-5 mb-5 text-left text-sm text-foreground/80 space-y-4">
              <p className="flex items-center gap-3">
                <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-background border border-border/50 text-xs font-medium shadow-sm">
                  1
                </span>
                <span>
                  하단의{" "}
                  <Share className="w-4 h-4 inline text-primary mx-0.5" /> 공유
                  버튼을 누르고
                </span>
              </p>
              <p className="flex items-center gap-3">
                <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-background border border-border/50 text-xs font-medium shadow-sm">
                  2
                </span>
                <span>
                  <strong className="text-foreground">
                    홈 화면에 추가{" "}
                    <Plus className="w-4 h-4 inline text-primary" />
                  </strong>
                  를 선택하세요
                </span>
              </p>
            </div>
          ) : (
            <div className="mb-5">
              {deferredPrompt ? (
                <Button
                  onClick={handleInstallClick}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-md active:scale-95 transition-transform"
                >
                  <Download className="w-5 h-5 mr-2" />앱 설치하기
                </Button>
              ) : (
                <div className="bg-muted/50 rounded-2xl p-5 text-left text-sm text-foreground/80">
                  <p className="leading-relaxed">
                    브라우저 우측 상단 메뉴(⋮)에서
                    <br />
                    <strong className="text-foreground">홈 화면에 추가</strong>
                    를 선택해주세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          onClick={handleDismiss}
        >
          7일간 보지 않기
        </button>
      </DialogContent>
    </Dialog>
  );
}
