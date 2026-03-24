"use client";

import { useEffect, useState } from "react";

// TODO: Push 알림 구현 시 사용
// function urlBase64ToUint8Array(base64String: string) {
//   const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);
//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }
  }, []);

  // TODO: Push 알림 구독/해제 기능 구현 시 활성화
  // async function subscribeToPush() { ... }
  // async function unsubscribeFromPush() { ... }
  // async function sendTestNotification() { ... }

  if (!isSupported) {
    return null;
  }

  // TODO: Push 알림 UI 구현 시 활성화
  return null;
}
