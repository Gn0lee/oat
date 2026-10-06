/** 헤더(ServiceHeader)와 활성 컴포저 사이에서 쓰는 도메인 중립 이벤트 */
export const COMPOSER_BACK_EVENT = "oat:composer-back";
export const COMPOSER_CLOSE_EVENT = "oat:composer-close";

export type ComposerEventDetail = { trigger?: HTMLElement | null };

export function dispatchComposerEvent(
  type: typeof COMPOSER_BACK_EVENT | typeof COMPOSER_CLOSE_EVENT,
) {
  window.dispatchEvent(
    new CustomEvent<ComposerEventDetail>(type, {
      detail: { trigger: document.activeElement as HTMLElement | null },
    }),
  );
}
