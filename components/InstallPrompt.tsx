"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream,
    );

    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (isStandalone) {
    return null;
  }

  return (
    <div>
      {isIOS && (
        <p>
          이 앱을 iOS 기기에 설치하려면, 공유 버튼
          <span role="img" aria-label="공유 아이콘">
            {" "}
            ⎋{" "}
          </span>
          을 탭한 후 &quot;홈 화면에 추가&quot;
          <span role="img" aria-label="추가 아이콘">
            {" "}
            ➕{" "}
          </span>
          를 선택하세요.
        </p>
      )}
    </div>
  );
}
