# 푸시 발송 경로 조사

- 조사일: 2026-11-22
- 관련 티켓: 알림(wayfinder #535), 이전 웹 시절 설계는 `.claude/docs/NOTIFICATIONS.md`
- 전제: iOS 우선 Expo(RN) 앱, CNG + Xcode 로컬 빌드, EAS 미사용. Android는 정식 출시 직전에 옮겨요. 서버는 셀프호스팅 미니 PC(Node/Hono)이고 Postgres 기반 큐(pg-boss 계열) worker가 돌아요. 서버는 잠깐 멈출 수 있어요. 가구원은 공용 장부를 함께 쓰고, 개인 장부는 본인만 봐요.
- 방법: Apple Developer 문서(문서 JSON 원문), Expo 문서(.md 원문), Firebase 문서, 라이브러리 README와 npm 레지스트리만 인용했어요. 1차 문서에서 확인하지 못한 항목은 "확인 못 함"으로 적었어요.

## 1. 결론 먼저

- **추천: APNs 직접 발송(`getDevicePushTokenAsync` + 서버에서 HTTP/2 + .p8 토큰 인증).** Android 이식 때 FCM HTTP v1을 같은 worker에 붙여요.
- 이유는 세 가지예요. EAS를 안 쓰기로 했는데 Expo Push는 Expo 프로젝트(projectId)와 Expo 서버에 올린 푸시 키가 필요해요. 알림 문구가 Expo 서버를 한 번 더 거쳐요. 셀프호스팅 서버가 멈췄다 살아날 때 만료·중복 제어를 우리 큐 한 곳에서 하는 게 단순해요.
- 비용은 우리가 떠안는 일이에요. JWT 갱신, HTTP/2 연결 관리, 410/400 응답에 따른 토큰 정리, sandbox/production 구분을 직접 해야 해요. 라이브러리(`apns2` 또는 `@parse/node-apn`)가 대부분 덜어줘요.
- 푸시 본문에는 금액·가맹점 같은 장부 내용을 넣지 않는 쪽이 Apple 가이드와 맞아요. 처음엔 "누가 무엇을 했다" 수준의 일반 문구로 보내고, 나중에 필요하면 Notification Service Extension으로 기기에서 채우는 길이 열려 있어요.

## 2. Expo Push Service vs APNs/FCM 직접 발송

| 기준 | Expo Push Service | APNs/FCM 직접 |
|---|---|---|
| 앱이 받는 토큰 | `ExpoPushToken` (`getExpoPushTokenAsync`) | APNs 기기 토큰 / FCM 토큰 (`getDevicePushTokenAsync`) |
| Expo 계정·projectId | 필요 | 불필요 |
| 자격증명 위치 | Expo 서버에 APNs 키·FCM 키를 올려야 함 | 우리 서버에만 둠 |
| 페이로드 경로 | 우리 서버 → Expo → Apple/Google | 우리 서버 → Apple/Google |
| 요금 | 무료 | 무료(Apple·Google 자체 요금 없음, 아래 참고) |
| 속도 제한 | 프로젝트당 초당 600건, 요청당 100건 | APNs는 연결·기기별 흐름 제어 |
| 결과 확인 | ticket + receipt(15분 뒤 조회, 24시간 보관) | HTTP 응답 하나로 즉시 |
| 장애 영향 | Expo 또는 Apple/Google 어느 쪽이 멈춰도 실패 | Apple/Google만 |

### 2.1 Expo Push Service

- **projectId 필요**: `getExpoPushTokenAsync`는 앱 설정에 projectId가 없고 옵션으로도 주지 않으면 `ERR_NOTIFICATIONS_NO_EXPERIENCE_ID`로 실패해요. 이 메서드는 Expo 서버에 요청을 보내서 오프라인이면 실패하니 재시도 로직이 필요하다고 해요. (https://docs.expo.dev/versions/latest/sdk/notifications/)
- **Expo 계정 필요 여부**: 설정 문서가 projectId를 "Expo Services를 쓰는 프로젝트의 UUID"라고 설명해요. 따라서 Expo 계정에 프로젝트를 만들어야 한다고 봐요. 계정이 꼭 필요하다는 문장은 따로 확인 못 했어요. (https://docs.expo.dev/push-notifications/push-notifications-setup/)
- **자격증명 업로드**: "Expo 백엔드가 앱에 알림을 보내려면 푸시 알림 키를 제공해야 한다"고 적혀 있어요. EAS Build를 쓰면 프로젝트에 키가 함께 들어가고, 로컬 빌드도 가능하지만 키 설정은 따로 해야 해요. iOS 키 교체는 `eas credentials`로 안내해요. (https://docs.expo.dev/versions/latest/sdk/notifications/, https://docs.expo.dev/push-notifications/push-notifications-setup/, https://docs.expo.dev/push-notifications/faq/)
- **페이로드 경유**: Expo는 알림 내용을 Google·Apple에 넘기는 동안만 메모리와 메시지 큐에 두고 DB에는 저장하지 않는다고 해요. 다만 "Expo 팀이 디버깅 중이면 내용을 볼 수 있다"고 밝혀요. (https://docs.expo.dev/push-notifications/faq/)
- **요금**: "Expo push notification service로 보내는 데 비용이 없다"고 해요. (https://docs.expo.dev/push-notifications/faq/) 요금표(https://expo.dev/pricing)에는 푸시 항목이 없어요.
- **속도 제한**: 프로젝트당 초당 600건이에요. 요청 하나에 메시지 100개까지, receipt 조회는 요청당 1000개까지예요. (https://docs.expo.dev/push-notifications/sending-notifications/)
- **ticket과 receipt**: ticket의 `ok`는 Expo가 받았다는 뜻일 뿐이에요. 약 15분 뒤 receipt를 조회해 Apple/Google 전달 결과를 확인하고, receipt는 24시간 뒤 지워져요. `DeviceNotRegistered`면 그 토큰으로 보내기를 멈춰야 해요. (https://docs.expo.dev/push-notifications/sending-notifications/)
- **보안**: 기본값으로는 Expo 토큰만 알면 누구나 보낼 수 있어요. 대시보드에서 액세스 토큰을 필수로 켤 수 있어요. (https://docs.expo.dev/push-notifications/sending-notifications/)
- **장애**: "Expo push 서비스에는 SLA가 없고 FCM·APNs도 가끔 장애가 있다"고 해요. 전달은 at-least-once 지향이라 드물게 중복되거나 누락돼요. (https://docs.expo.dev/push-notifications/sending-notifications/, https://docs.expo.dev/push-notifications/faq/)
- **필수 아님**: "Expo Push 사용은 필수가 아니고 `getDevicePushTokenAsync`로 FCM·APNs에 직접 보낼 수 있다"고 해요. `expo-notifications` API는 푸시 서비스와 무관하게 쓸 수 있어요. (https://docs.expo.dev/push-notifications/faq/, https://docs.expo.dev/push-notifications/push-notifications-setup/)

### 2.2 APNs 직접 발송

- **앱 쪽**: `getDevicePushTokenAsync()`가 네이티브 APNs/FCM 토큰을 줘요. 서버에 보내면 Expo를 거치지 않아요. 앱에 APNs 엔타이틀먼트가 있어야 하고 CNG에서는 `expo-notifications` 플러그인이 넣어줘요. (https://docs.expo.dev/push-notifications/sending-notifications-custom/)
- **연결**: HTTP/2와 TLS 1.2 이상으로 `api.push.apple.com`(production) 또는 `api.sandbox.push.apple.com`(development)에 붙어요. 443 대신 2197 포트도 돼요. 연결은 "몇 시간에서 며칠" 재사용하고, 한가하면 1시간마다 HTTP/2 PING을 보내라고 해요. 페이로드는 4KB까지예요. (https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
- **.p8 토큰 인증**: JWT는 ES256만 지원하고 헤더에 `kid`(Key ID), 클레임에 `iss`(Team ID)와 `iat`를 넣어요. 토큰은 20분보다 자주, 60분보다 드물게 바꾸면 안 돼요. 1시간이 넘으면 `ExpiredProviderToken`(403), 너무 자주 바꾸면 `TooManyProviderTokenUpdates`(429)예요. 하나의 토큰으로 여러 서버·여러 앱에 보낼 수 있어요. (https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns)
- **키 종류**: 팀 단위 키는 이제 Sandbox 또는 Production 한쪽 전용으로 만들 수 있고 환경별 2개까지예요. 기존의 양쪽 겸용 키도 계속 지원하지만 환경별 키를 권장해요. (같은 문서)
- **Node 라이브러리 후보** (2026-11-22 npm·GitHub 기준)
  - `apns2` 14.0.0: 2026-11-17 릴리스("new send response, Bun support"), 바로 전 13.0.0도 같은 날이에요. .p8 JWT + HTTP/2, 응답에 `apnsId`·`statusCode`를 돌려주고 오류는 `err.reason`으로 와요. Node 24 이상 필요해요. TypeScript예요. (https://github.com/AndrewBarba/apns2, https://www.npmjs.com/package/apns2)
  - `@parse/node-apn` 8.2.0: 2026-11-01 릴리스("Add support for Node.js 26"). 원조 `node-apn`의 포크로 HTTP/2, 토큰 인증, 프록시, 연결 풀(MultiProvider)을 지원해요. `NODE_ENV=production`이 아니면 기본으로 sandbox에 붙는 점을 조심해야 해요. (https://github.com/parse-community/node-apn)
  - 원조 `node-apn`은 3.0.0이 2022-05가 마지막이라 제외해요. (https://www.npmjs.com/package/node-apn)
- **FCM HTTP v1 (Android 이식 때)**: `POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`에 서비스 계정 OAuth 2.0 토큰(`firebase.messaging` 스코프)을 붙여요. Firebase Admin SDK를 쓰면 인증을 대신 처리해요. (https://firebase.google.com/docs/cloud-messaging/send/v1-api) `firebase-admin` 최신은 14.5.1이에요(npm). 앱 쪽은 Android 13 이상이면 알림 채널을 먼저 만들어야 해요(기존 조사 2026-11-11 문서 참고).

## 3. 기기 토큰 수명

- **언제 바뀌나 (APNs)**: Apple은 "기기 토큰을 로컬에 캐시하지 말라"고 하고, 새 토큰이 나오는 경우로 백업에서 복원할 때, 새 기기에 앱을 설치할 때, OS를 재설치할 때를 들어요. 앱은 **실행할 때마다** 등록하고 토큰을 받아 서버로 보내요. 한 사용자가 기기 여러 대를 가질 수 있으니 서버는 토큰 여러 개를 다뤄야 해요. (https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns)
- 앱 재설치나 일반 OS 업데이트만으로 APNs 토큰이 바뀌는지는 Apple 문서에 명시가 없어서 **확인 못 함**이에요. 참고로 Expo FAQ는 `ExpoPushToken`(Expo 토큰)이 iOS에서 재설치 후에도 그대로라고 하지만, 이건 Expo 쪽 토큰 이야기예요. (https://docs.expo.dev/push-notifications/faq/)
- **실행 중 변경**: `addPushTokenListener`가 "드물게 앱 실행 중에 토큰이 바뀔 수 있다"며 새 토큰을 서버에 다시 등록하라고 해요. (https://docs.expo.dev/versions/latest/sdk/notifications/)
- **410 Unregistered / ExpiredToken**: "기기 토큰이 그 topic에 더는 활성이 아니다"는 뜻이에요. 응답 본문의 `timestamp`(ms)는 APNs가 무효를 확인한 시각이에요. 다시 보낼 필요가 없고, 같은 토큰을 앱이 다시 받아오면 그때만 써요. 410은 "오류 조건으로 치지 않는다"고 해요. (https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns)
- **400 BadDeviceToken**: 토큰이 잘못됐거나 **환경이 안 맞을 때**예요. `BadDeviceToken`, `DeviceTokenNotForTopic`, `Forbidden`, `ExpiredToken`, `Unregistered`, `PayloadTooLarge`는 재시도하지 말라고 하고, 5xx는 "15분 뒤" 백오프로 재시도해도 된다고 해요. 4xx가 쌓이면 APNs가 연결을 끊고, `BadDeviceToken`은 더 빨리 끊는다고 해요. (같은 문서)
- **sandbox vs production**: `expo-notifications` 플러그인은 `aps-environment`를 `development`로 넣고, Xcode가 릴리스 아카이브에서 `production`으로 바꿔요. (https://docs.expo.dev/versions/latest/sdk/notifications/) 즉 Xcode에서 직접 실행한 개발 빌드의 토큰은 sandbox, TestFlight·App Store 빌드의 토큰은 production이에요. 서버는 토큰과 함께 환경을 저장하고 맞는 호스트로 보내야 해요. 환경이 틀리면 `BadDeviceToken`이에요(위 문서).
- **FCM 쪽 참고**: 서버에 등록 시각을 저장하고 토큰이 같아도 매번 갱신하라고 강하게 권해요. 월 1회 갱신이 균형점이고, 270일 비활성이면 FCM이 만료시켜요. `UNREGISTERED`(404)는 삭제해요. iOS에는 이런 자동 만료가 없으니 오래된 등록은 서버가 직접 정리하라고 해요. (https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- 정리하면 **앱 시작마다 토큰을 받아 서버에 upsert(마지막 확인 시각 갱신)** 하는 게 Apple·Firebase 양쪽 권장과 맞아요.

## 4. iOS 알림 기능

- **interruption level**: `passive`(화면·소리 없이 목록에만), `active`(기본), `time-sensitive`(예약 요약과 집중 모드를 뚫음, 무음 스위치는 못 뚫음), `critical`(무음 스위치까지 뚫음, 별도 엔타이틀먼트 필요). 페이로드 `aps.interruption-level`로 지정해요. (https://developer.apple.com/design/human-interface-guidelines/managing-notifications, https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)
- **time-sensitive 사용 기준**: HIG는 "지금 일어나는 일이거나 1시간 안에 일어날 일"에만 쓰라고 해요. 처음 받을 때 시스템이 설명하고 끌 방법을 주며, 이후에도 주기적으로 다시 물어봐요. 마케팅에는 절대 쓰지 말라고 해요. (https://developer.apple.com/design/human-interface-guidelines/managing-notifications)
- **time-sensitive 엔타이틀먼트**: Xcode의 "Time Sensitive Notifications" capability(`com.apple.developer.usernotifications.time-sensitive`)가 필요한 것으로 알고 있지만, 해당 문서 페이지가 404라 **확인 못 함**이에요. 현재 엔타이틀먼트 목록에는 `critical-alerts`, `filtering`만 보였어요. (https://developer.apple.com/documentation/bundleresources/entitlements) oat 알림에 time-sensitive가 필요한 경우는 거의 없어서 우선순위는 낮아요.
- **provisional authorization**: 권한 팝업 없이 알림 센터에만 조용히 보내고, 알림에 "유지/끄기" 버튼이 붙어요. 이 경우엔 첫 실행에 요청해도 된다고 해요. 상태는 사용자가 고를 때까지 `provisional`이에요. (https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications) Expo에서는 `allowProvisional` 옵션이에요. (https://docs.expo.dev/versions/latest/sdk/notifications/)
- **권한 요청 타이밍**: 첫 요청에서만 시스템 팝업이 뜨고 이후엔 안 떠요. "첫 실행에 자동으로 묻지 말고, 목적이 보이는 맥락에서 물으라"고 해요. 예로 할 일 앱은 첫 할 일을 예약한 뒤 물어요. (https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications) oat에서는 가구원 초대를 보냈거나 공용 장부에 첫 기록을 남긴 직후가 맞는 자리예요(추론).
- **thread-id**: 관련 알림을 묶는 식별자예요. (https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification) 가구·장부 단위로 묶는 데 써요.
- **apns-collapse-id**: 같은 값이면 여러 요청을 알림 하나로 합쳐요. 64바이트까지예요. (https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns) Expo 문서는 iOS에서 이미 표시된 알림도 교체한다고 해요. (https://docs.expo.dev/push-notifications/sending-notifications/)
- **apns-expiration**: 0이 아니면 APNs가 그 시각까지 저장했다 최소 한 번 전달을 시도하고, 0이면 한 번만 시도하고 저장하지 않아요. 생략하면 APNs 저장 정책을 따르고, 저장은 최대 30일이에요. 만료 시각은 최선 노력이라 넘겨서 도착할 수도 있어요. (https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
- **잠금화면 미리보기(Show Previews)**: 사용자는 모든 앱의 미리보기를 숨길 수 있고, 그러면 앱 아이콘과 "알림" 제목만 보여요. 그래서 "새 댓글"처럼 내용을 드러내지 않는 일반 문구를 `hiddenPreviewsBodyPlaceholder`로 주라고 해요. (https://developer.apple.com/design/human-interface-guidelines/notifications, https://developer.apple.com/documentation/usernotifications/unnotificationcategory/hiddenpreviewsbodyplaceholder) iOS 기본값이 "잠금 해제 시"인지는 Apple 지원 문서 본문을 받지 못해 **확인 못 함**이에요.
- **민감 정보**: HIG는 "민감하거나 개인적인 정보를 알림에 넣지 말라"고 하고, 페이로드 문서는 "고객 정보나 신용카드 번호 같은 민감 데이터를 넣지 말고, 꼭 넣어야 하면 암호화한 뒤 Notification Service Extension에서 복호화하라"고 해요. (https://developer.apple.com/design/human-interface-guidelines/notifications, https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)
- **집중 모드**: 집중 모드가 알림 표시를 늦춰도 알림 자체는 도착 즉시 존재해요. 비통신 알림은 interruption level로 전달 시점이 정해져요. `filter-criteria` 키로 집중 필터를 지원할 수 있어요. (https://developer.apple.com/design/human-interface-guidelines/managing-notifications, https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)
- **앱 배지**: 읽지 않은 알림 수에만 쓰고 다른 숫자(금액 등)에는 쓰지 말라고 해요. 열어본 즉시 갱신하고, 0으로 만들면 알림 센터의 관련 알림도 지워져요. 사용자가 배지를 끌 수 있으니 배지에만 의존하지 말라고 해요. (https://developer.apple.com/design/human-interface-guidelines/notifications) Expo `setBadgeCountAsync`는 iOS에서 `allowBadge` 권한이 있어야 동작해요. (https://docs.expo.dev/versions/latest/sdk/notifications/)
- **categories / actions**: 앱 실행 시 카테고리와 액션을 등록하고 페이로드 `aps.category`로 연결해요. 액션 버튼은 4개까지이고, 앱을 여는 것뿐인 액션은 만들지 말라고 해요. 잠금 상태에서도 액션을 누를 수 있어 파일 보호 등급 때문에 디스크 접근이 막힐 수 있어요. (https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types, https://developer.apple.com/design/human-interface-guidelines/notifications) Expo는 `setNotificationCategoryAsync`이고 카테고리 id에 `:`와 `-`를 쓰지 말래요. (https://docs.expo.dev/versions/latest/sdk/notifications/) 공용 장부 변경 요청의 "승인/거절" 버튼 후보예요.
- **mutable-content + Notification Service Extension**: `mutable-content: 1`과 `alert`(제목·부제·본문 중 하나)가 있어야 확장이 실행돼요. 용도로 암호화된 데이터 복호화, 큰 첨부 다운로드, 기기 데이터로 내용 갱신을 들어요. 약 30초 안에 끝내야 하고, 시간이 다 되면 `serviceExtensionTimeWillExpire()`에서 가진 걸 즉시 돌려줘야 해요. 완료 핸들러를 안 부르면 원래 내용이 보여요. 앱의 알림이 꺼져 있으면 확장도 안 돌아요. (https://developer.apple.com/documentation/usernotifications/modifying-content-in-newly-delivered-notifications)
  - oat에 적용하면: 서버는 "가구원이 공용 장부를 수정했어요" 같은 일반 문구와 기록 id만 보내고, 확장이 기기 저장소나 서버에서 금액·가맹점을 채우는 구조가 가능해요. 다만 확장은 별도 네이티브 타깃(Swift)이라 Expo CNG에서 만드는 비용이 있고, 기기 저장소·인증 토큰을 App Group/키체인으로 공유해야 해요(추론, Expo 쪽 공식 지원 문서는 확인 못 함).

## 5. expo-notifications 사용 포인트

- **원격·로컬 모두 지원**: 같은 라이브러리로 푸시 토큰, 로컬 예약, 카테고리, 배지, 권한을 다뤄요. Expo Go(SDK 53 이상)는 푸시를 지원하지 않아 개발 빌드가 필요해요. (https://docs.expo.dev/versions/latest/sdk/notifications/, https://docs.expo.dev/push-notifications/faq/)
- **꺼진 앱에서 탭했을 때**: `useLastNotificationResponse()`는 `undefined`(아직 모름), `null`(없음), 응답 객체 셋 중 하나를 돌려줘요. 훅이 싫으면 `getLastNotificationResponseAsync()`를 써요. 처리 후 `clearLastNotificationResponseAsync()`로 지워야 같은 응답을 두 번 처리하지 않아요. (https://docs.expo.dev/versions/latest/sdk/notifications/)
- **expo-router 딥링크**: 문서 예시는 `app/_layout.tsx`에서 `getLastNotificationResponse()`로 콜드 스타트 응답을 먼저 확인하고, `addNotificationResponseReceivedListener`로 실행 중 탭을 받아 `data.url`로 `router.push`한 뒤 응답을 지우는 패턴이에요. (https://docs.expo.dev/versions/latest/sdk/notifications/) 페이로드에 `url` 대신 기록 id만 넣고 앱이 경로를 만드는 편이 버전 차이에 안전해요(추론).
- **로컬 알림 예약**: 트리거는 시간 간격, 날짜, 반복(iOS는 calendar, Android는 daily/weekly/monthly/yearly), 위치(iOS)예요. `scheduleNotificationAsync`는 id를 돌려주고, `cancelScheduledNotificationAsync(id)`로 취소해요. 예약됐다고 표시가 보장되진 않고 `setNotificationHandler`도 설정해야 해요. (https://docs.expo.dev/versions/latest/sdk/notifications/) Apple도 조건이 바뀌면 예약을 취소하라고 해요. (https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app)
  - "백그라운드 진입 때 예약, 포그라운드 복귀 때 취소" 패턴은 위 API로 만들 수 있어요. 예약 id를 고정 문자열로 정하면 중복 예약도 막을 수 있어요(추론). iOS의 대기 중 로컬 알림 개수 제한(흔히 64개로 알려짐)은 1차 문서에서 **확인 못 함**이에요.
- **백그라운드 작업 제약**: `registerTaskAsync`는 포그라운드·백그라운드·종료 상태에서 알림 수신 시 JS를 돌리지만, 종료 상태에서는 "헤드리스 백그라운드 알림"(data만, iOS는 `contentAvailable: true`)만 작업을 깨워요. iOS는 `UIBackgroundModes`에 `remote-notification`이 필요해요(`enableBackgroundRemoteNotifications`). (https://docs.expo.dev/versions/latest/sdk/notifications/)
- Apple은 백그라운드 알림을 저우선으로 다루고 전달을 보장하지 않으며 "시간당 2~3개 넘게 보내지 말라"고 해요. 새 백그라운드 알림이 오면 이전 것은 버려지고, 앱을 강제 종료하면 보류 중인 알림도 버려요. 우선순위 5, `apns-push-type: background`여야 해요. (https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app) 그래서 백그라운드 푸시로 데이터를 동기화하는 설계는 기대면 안 돼요.

## 6. 서버가 멈췄다 살아났을 때

- **APNs 쪽 보관**: APNs는 기기가 꺼져 있으면 `apns-expiration`에 따라 최대 30일 보관해요. 단 **번들 ID당 하나만** 저장하고 보통 마지막 것을 남겨요. 우선순위 5와 1 알림은 묶여서 몰아서 올 수 있어요. (https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns) 즉 APNs는 "기기가 꺼진 동안"을 버퍼링해주지, "우리 서버가 꺼진 동안"은 버퍼링해주지 않아요. 서버 쪽 지연은 우리 큐가 결정해요.
- **오래된 알림을 보내지 말아야 하는 근거**
  - HIG: "같은 일로 알림을 여러 번 보내지 말라. 알림 센터가 차고 사람들이 모든 알림을 끌 수 있다." (https://developer.apple.com/design/human-interface-guidelines/notifications)
  - HIG: 알림은 "시의적절하고 가치가 큰 정보"이고, 포그라운드에서는 화면에 조용히 반영하라고 해요. (같은 문서) 사용자가 이미 앱에서 본 변경을 몇 시간 뒤 푸시로 받으면 이 기준에 어긋나요.
  - HIG: time-sensitive는 "지금 또는 1시간 안" 일에만 써요. (https://developer.apple.com/design/human-interface-guidelines/managing-notifications)
  - 앱 안 알림 목록(서버 DB)이 진실의 원천이면, 늦은 푸시를 버려도 정보는 잃지 않아요(추론).
- **pg-boss 기능 요약** (v12.39.0, 2026-11-21 npm 기준, 문서: https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md, https://github.com/timgit/pg-boss/blob/master/docs/api/queues.md)
  - **지연 작업**: `startAfter`에 초, ISO 날짜, 상대 간격('1 hour'), Date를 넣어요.
  - **재시도**: `retryLimit`(기본 2), `retryDelay`(기본 0초), `retryBackoff`(지수 백오프 + 지터), `retryDelayMax`예요.
  - **만료**: `expireInSeconds`(기본 15분)는 active 상태로 머무를 수 있는 시간이에요. 넘기면 재시도나 실패 처리돼요. "알림 유효기간"과는 다른 개념이에요.
  - **보존**: `retentionSeconds`(기본 14일)는 created/retry 상태로 남을 수 있는 시간이고, 넘기면 삭제돼요. 완료 작업은 `deleteAfterSeconds`(기본 7일) 뒤 지워요.
  - **singleton/중복 억제**: 큐 정책 `short`(created 1개), `singleton`(active 1개), `stately`(상태별 1개), `exclusive`(대기+실행 합쳐 1개), `key_strict_fifo`(키별 순서 보장)가 있고 모두 `singletonKey`로 키별 적용이 돼요. 중복 억제가 걸리면 `send()`가 id 대신 `null`을 돌려줘요.
  - **dead letter**: 큐에 `deadLetter`로 실패 작업을 보낼 큐를 지정해요.
- **oat에 맞춘 처리 규칙 (추론)**
  1. 알림 작업에 이벤트 발생 시각을 넣고, worker는 보내기 직전에 "지금 - 발생 시각"이 기준(예: 공용 장부 변경 30분, 초대 24시간)을 넘으면 푸시를 건너뛰고 앱 안 알림만 남겨요.
  2. APNs `apns-expiration`도 같은 기준으로 발생 시각 + N으로 줘요. 기기가 꺼져 있던 경우도 같은 규칙이 적용돼요.
  3. 같은 기록에 대한 연속 변경은 `singletonKey`(예: 장부 기록 id) + `apns-collapse-id`로 합쳐요.
  4. 재시작 직후 쌓인 작업이 한꺼번에 나가지 않도록 규칙 1이 먼저 걸러요. APNs 5xx는 `retryBackoff`로 재시도하고, 재시도 시점에도 규칙 1을 다시 검사해요.

## 7. Apple 심사 가이드라인의 푸시 관련 조항

(https://developer.apple.com/app-store/review/guidelines/)

- **4.5.4**: 푸시 알림이 앱 동작에 필수여서는 안 되고, 민감한 개인 정보나 기밀 정보를 보내는 데 쓰면 안 돼요. 프로모션·직접 마케팅은 앱 UI의 동의 문구로 명시적 옵트인을 받고 앱 안에 옵트아웃 방법을 줄 때만 돼요. 남용하면 권한이 철회될 수 있어요.
- **4.5.3**: 푸시로 스팸·피싱·원치 않는 메시지를 보내지 말라고 해요.
- **5.1.2(i)**: 기능·콘텐츠 사용이나 보상을 대가로 푸시 같은 시스템 기능을 켜도록 요구하면 안 돼요.
- **2.5.16**: 알림은 앱의 내용·기능과 관련 있어야 해요.
- **2.5.18**: 디스플레이 광고는 메인 앱 바이너리에만 두고 알림에는 넣지 말라고 해요.
- HIG도 마케팅 알림은 명시적 동의와 앱 안 설정 화면을 요구하고, time-sensitive로 보내지 말라고 해요. (https://developer.apple.com/design/human-interface-guidelines/managing-notifications)
- oat 영향: 푸시를 꺼도 모든 기능이 돌아가야 해요(앱 안 알림 목록이 기본). 장부 금액·가맹점·자산 잔액은 4.5.4의 "민감한 개인 정보"에 걸릴 여지가 있어서 본문에 넣지 않는 쪽이 안전해요. 개인 장부 내용은 가구원에게 가는 알림에 절대 들어가면 안 돼요.

## 8. oat에 대한 시사점

**추천: APNs 직접 발송 (Android 이식 때 FCM HTTP v1 추가)**

- **이유 1, EAS 미사용 방침과 맞아요.** Expo Push를 쓰려면 Expo 프로젝트(projectId)를 만들고 APNs 키를 Expo 서버에 올려야 해요. 직접 발송은 .p8 키가 미니 PC에만 있어요.
- **이유 2, 금융 데이터가 제3자를 덜 거쳐요.** Expo는 저장하지 않는다고 하지만 디버깅 때 내용을 볼 수 있다고 밝혀요. 본문을 일반 문구로 줄이더라도 경유지가 하나 적은 쪽이 프라이버시 설명이 단순해요.
- **이유 3, 실패 처리가 한 곳에 모여요.** 직접 발송은 HTTP 응답에서 410/400을 바로 받아 같은 트랜잭션에서 토큰을 정리할 수 있어요. Expo는 ticket을 저장했다 15분 뒤 receipt를 조회하는 두 번째 작업이 필요하고 receipt는 24시간 뒤 사라져요. 서버가 하루 멈추면 receipt를 놓쳐요.
- **이유 4, 장애 지점이 하나 줄어요.** Expo Push에는 SLA가 없어요. 셀프호스팅 서버 자체가 이미 단일 장애점이라 의존을 더 늘릴 이유가 적어요.
- **이유 5, 규모상 Expo의 장점이 작아요.** 무료·배치 API·자동 스로틀링은 대량 발송에서 빛나는데, 가족 단위 앱의 발송량은 작아요(추론).

**Expo Push가 나은 경우**: iOS와 Android를 같은 날 열고 FCM 설정을 미루고 싶을 때, 또는 서버 구현을 하루라도 줄이고 싶을 때예요. 나중에 바꿀 때는 앱의 토큰 함수만 바꾸고 서버 발송부를 갈아끼우면 돼서 되돌림 비용은 크지 않아요.

**설계 메모**

1. 토큰 테이블: 사용자, 기기(앱 설치 id), 플랫폼, 환경(sandbox/production), 토큰, 마지막 확인 시각, 무효 시각. 앱 시작마다 upsert해요.
2. 410은 무효 시각을 기록하고 이후 발송에서 빼요. 400 `BadDeviceToken`은 환경 불일치부터 의심해요.
3. 라이브러리는 `apns2`(TS, Node 24+, 최근 메이저 릴리스)를 1순위, `@parse/node-apn`을 2순위로 PoC에서 비교해요. 서버 Node 버전부터 확인해야 해요.
4. 본문은 "민지가 공용 장부 기록을 수정했어요" 수준. 금액·가맹점·개인 장부 내용은 넣지 않아요. 미리보기 숨김용 문구도 정해요.
5. 권한은 첫 실행에 묻지 않고, 가구 초대나 첫 공용 기록 직후 이유를 보여준 뒤 물어요. provisional로 먼저 조용히 보내는 안도 후보예요.
6. 기본 interruption level은 `active`, 요약성 알림은 `passive`. time-sensitive는 쓰지 않아요.
7. `thread-id`는 가구 또는 장부 단위, `apns-collapse-id`와 pg-boss `singletonKey`는 기록 단위로 맞춰요.
8. 오래된 알림 컷오프와 `apns-expiration`을 같은 기준으로 둬요.
9. 꺼진 앱에서 탭하면 `_layout.tsx`에서 마지막 응답을 읽고 기록 id로 이동한 뒤 응답을 지워요.

## 9. 확인하지 못한 것

- time-sensitive 엔타이틀먼트의 현재 요구 여부(Apple 엔타이틀먼트 페이지 404)
- 앱 재설치·일반 OS 업데이트만으로 APNs 기기 토큰이 바뀌는지(Apple 문서는 백업 복원·새 기기·OS 재설치만 명시)
- iOS 잠금화면 미리보기 기본값, 대기 중 로컬 알림 개수 상한(Apple 지원 문서 본문을 받지 못함)
- Expo Push에 Expo 계정이 반드시 필요하다는 직접 문장(projectId가 Expo Services 프로젝트라는 설명까지만 확인)
- Expo CNG에서 Notification Service Extension 타깃을 만드는 공식 경로
- FCM 메시지 기본 TTL의 Firebase 원문(Expo 문서가 "각 제공자 기본값 4주"라고만 적음, Firebase 옵션 문서 URL은 404)
