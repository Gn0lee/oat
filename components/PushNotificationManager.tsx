"use client";

import { useEffect } from "react";

export function PushNotificationManager() {
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch((error) => {
          console.error("Service worker registration error:", error);
        });
    }
  }, []);

  return null;
}
