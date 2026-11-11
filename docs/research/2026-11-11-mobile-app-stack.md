# 모바일 앱 스택 비교 (Expo·Flutter·네이티브·웹뷰 래핑)

- 조사일: 2026-11-11
- 관련 티켓: 모바일 앱 스택 비교 (Expo·Flutter·네이티브), 지도 "oat 전면 개편 지도: 통합 원장·앱 우선·셀프호스팅"
- 전제: iOS+Android 앱 우선(웹은 랜딩만), 1인 개발, TypeScript 서버, 초대제로 시작해 정식 스토어 출시가 목표
- 방법: 공식 문서·공식 변경 로그·스토어 정책 원문만 인용했어요. 확인하지 못한 항목은 "미확인"으로 표시했고, 직접 써봐야 알 수 있는 항목은 PoC로 넘겼어요.

## 1. 결론 먼저

- **추천: Expo(React Native, TypeScript).** 서버와 같은 언어라 타입·스키마(zod 등)를 한 패키지로 공유할 수 있고, 홈 위젯·공유 수신·푸시·생체인증·OTA가 모두 공식 모듈이나 공식 설정 플러그인으로 열려 있어요.
- **차순위: Flutter.** UI 품질과 입력 제어는 강하지만 TS 타입 공유가 끊기고, 위젯과 공유 확장은 어차피 네이티브 코드를 직접 써야 해요.
- 네이티브 2벌(Swift+Kotlin)은 1인 개발에 맞지 않고, 웹뷰 래핑은 Apple 심사 위험과 입력 UX 한계 때문에 제외해요.
- 단, **"숫자 입력·키보드·바텀시트 체감 품질"은 문서만으로 판정할 수 없어요.** PoC(앱 스택 PoC: 가계부 입력 화면 직접 써보기)에서 실측해야 해요.

## 2. 기준별 비교

| 기준 | Expo (RN) | Flutter | 네이티브 | 웹뷰(Capacitor 등) |
|---|---|---|---|---|
| 서버와 타입/스키마 공유 | 같은 TS, pnpm/bun 워크스페이스 공유 | Dart라 별도 생성물 필요 | 언어 2개, 별도 생성물 | TS 공유 가능 |
| 홈 위젯 | `expo-widgets`(iOS+Android, SDK 58) | `home_widget`, 위젯 UI는 네이티브로 작성 | WidgetKit(SwiftUI), Android는 별도 | 네이티브 코드 필요 |
| 공유 수신 | `expo-sharing`(실험적) 또는 커뮤니티 플러그인 | `receive_sharing_intent`(수동 설정) | 가장 자유로움 | 플러그인 의존 |
| 푸시 | Expo Push 또는 FCM/APNs 토큰 직접 | 미확인 | 직접 | 플러그인 |
| 생체인증 | `expo-local-authentication` | 미확인 | 직접 | 플러그인 |
| OTA | EAS Update, 자체 서버 가능 | Shorebird(서드파티) | 없음(스토어 배포) | 웹 번들은 서버에서 교체 |
| 심사 위험 | 낮음 | 낮음 | 낮음 | 4.2 "repackaged website" 위험 |

## 3. 항목별 근거

### 3.1 Expo (React Native)

- **릴리스 흐름**: Expo SDK 58이 2026-10-15에 나왔고, SDK 57은 2026-06-30, SDK 56은 2026-05-21이에요. 약 4~5개월 간격이에요. (Expo changelog: https://expo.dev/changelog)
- **SDK 58 내용**: React Native가 0.86에서 0.88로 올랐어요. `expo-widgets`가 Android를 지원하기 시작했고, Expo UI에 BottomSheet 컴포넌트와 NavigationStack 등이 추가됐어요. Android는 R8이 릴리스 빌드에서 기본 켜졌고, iOS는 SceneDelegate를 prebuild가 만들어요. (https://expo.dev/changelog/sdk-58)
- **위젯**: `expo-widgets`로 iOS 홈·잠금 화면 위젯, Live Activities, Android 홈 위젯을 만들 수 있어요. 위젯 컴포넌트는 `'widget'` 지시어로 별도 번들이 돼 격리된 런타임에서 돌아가서, 훅·상태·async·일반 RN 컴포넌트를 쓸 수 없고 데이터는 props로만 받아요. 개발 빌드와 CNG가 필요하고, 상호작용·설정형 위젯은 iOS 17 이상이에요. 문서에는 alpha/beta/stable 표기가 없어서 **성숙도는 미확인**이에요. (https://docs.expo.dev/versions/latest/sdk/widgets/)
- **공유 수신**: `expo-sharing`이 SDK 58에서 수신을 지원하지만 문서가 "experimental"이라고 밝히고, iOS 공유 확장이 메인 타깃을 여는 방식이라 Apple이 공식 지원하지 않으며 이후 iOS에서 깨질 수 있다고 적혀 있어요. 활성화 규칙으로 텍스트·URL·이미지를 받을 수 있고, 설정 후 새 네이티브 빌드가 필요해요. (https://docs.expo.dev/versions/v58.0.0/sdk/sharing.md) 커뮤니티 대안으로 `expo-share-intent`, `expo-share-extension`(커스텀 UI), `@bacons/apple-targets`(Swift 직접 작성)가 있다고 검색 결과에서 확인했지만 1차 문서는 확인하지 못했어요. 카드 문자는 문자 앱의 공유 시트로 넘어오는 텍스트라 "텍스트 공유 수신"이 핵심이에요.
- **푸시**: Expo Push 토큰을 Expo 서비스로 보내거나, `getDevicePushTokenAsync`로 FCM/APNs 토큰을 받아 서버가 직접 보낼 수 있어요. 셀프호스팅 서버면 후자도 선택지예요. Android 13 이상은 알림 채널을 먼저 만들어야 하고, Expo Go에서는 Android 원격 푸시가 안 돼서 개발 빌드가 필요해요. (https://docs.expo.dev/versions/latest/sdk/notifications/)
- **생체인증**: `expo-local-authentication`이 Face ID/Touch ID/지문을 지원해요. iOS는 `NSFaceIDUsageDescription`이 필요하고 Expo Go에서는 Face ID를 테스트할 수 없어요. (https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- **OTA**: EAS Update는 JS·스타일·이미지만 바꿔요. 네이티브 코드·권한·SDK 버전 변경은 새 바이너리가 필요해요. runtimeVersion으로 호환 빌드에만 배포해요. **자체 서버**도 Expo Updates 프로토콜을 구현하면 쓸 수 있고 예제 레포가 있어요. 과금은 월간 활성 사용자(MAU) 기준이에요(요금표는 확인하지 못함). (https://docs.expo.dev/eas-update/introduction/, https://docs.expo.dev/eas-update/custom-updates-server/)
- **빌드**: `eas build --local`로 로컬 빌드가 되지만 Expo 로그인이 필요해요. CNG로 prebuild한 뒤 Xcode/Android Studio로 직접 빌드하는 경로도 가능해요. iOS 빌드는 맥이 필요해요. (https://docs.expo.dev/build-reference/local-builds/)
- **모노레포**: pnpm/bun 워크스페이스에서 공유 패키지를 `workspace:*`로 쓰고, SDK 52부터 Metro 설정이 자동이에요. 중복 `react`/`react-native` 버전만 조심하면 돼요. 서버와 TS 패키지를 공유한다는 직접적인 설명은 문서에 없어서, 이 부분은 일반적인 워크스페이스 동작에 기댄 추론이에요. (https://docs.expo.dev/guides/monorepos/)
- **리스크**: 위젯·공유 수신이 새롭거나 실험적이고, SDK가 4~5개월마다 올라 유지보수 부담이 있어요.

### 3.2 Flutter

- 최신 안정판은 3.47(2026-08-12)이고 3.47.8 이상 사용을 권고하는 보안 공지가 있어요. (https://docs.flutter.dev/release/whats-new)
- **위젯**: `home_widget` 0.10.0은 Flutter로 위젯을 쓰게 해주지 않고 네이티브 코드로 위젯을 써야 한다고 명시해요. (https://pub.dev/packages/home_widget) 이 점이 위젯에서 Expo와 갈리는 지점이에요.
- **공유 수신**: `receive_sharing_intent` 1.9.0은 iOS에서 Xcode로 Share Extension 타깃, App Group, 빌드 단계 순서까지 수동 설정이 필요하고 Swift Package Manager가 필수예요. Android도 매니페스트 수동 설정이에요. (https://pub.dev/packages/receive_sharing_intent)
- **네이티브 연동**: 플랫폼 채널은 타입 안전하지 않아서 Pigeon을 권장해요. (https://docs.flutter.dev/platform-integration/platform-channels)
- **OTA**: Shorebird는 서드파티 코드 푸시 서비스예요. 문서에서 운영 주체와 요금, 스토어 정책 설명을 확인하지 못했어요. (https://docs.shorebird.dev/)
- **타입 공유**: Dart라 TS 서버와 직접 타입을 공유할 수 없어요. OpenAPI 같은 스키마에서 Dart 코드를 생성해야 하는데, 이 판단은 일반적인 추론이고 공식 문서 확인은 못 했어요.
- 푸시·생체인증 패키지(firebase_messaging, local_auth)는 이번에 1차 문서를 확인하지 못했어요.

### 3.3 네이티브 (Swift/Kotlin)

- WidgetKit 위젯은 SwiftUI로 만들고 App Group으로 앱과 데이터를 공유해요. (Apple 개발자 문서 본문을 받지 못해 일반 지식으로 요약했어요: https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension)
- 플랫폼 기능 접근은 가장 자유롭지만 코드베이스가 둘이에요. 1인 개발에 앱 두 벌, 서버 TS 타입 공유 불가, 기능마다 2배 구현이라 비용이 커요.
- 위젯·공유 확장처럼 정말 네이티브가 필요한 조각만 Swift로 쓰는 건 Expo에서도 가능해요(`@bacons/apple-targets` 경로, 1차 문서 미확인).

### 3.4 웹뷰 래핑 (Capacitor 등)

- Capacitor는 웹 기반 앱을 네이티브 런타임에 올리는 도구예요(현재 문서 v8). (https://capacitorjs.com/docs)
- Apple 4.2: "리패키징한 웹사이트를 넘어서는 기능·콘텐츠·UI가 있어야 한다"고 해요. 4.2.2는 웹 클리핑이나 링크 모음을 막아요. 위젯·공유·푸시·생체인증을 붙이면 통과 가능성은 올라가지만 위험이 남아요. (https://developer.apple.com/app-store/review/guidelines/)
- 이번 지도의 핵심 기준인 "금액 입력·키보드·바텀시트 품질"에서 가장 불리할 것으로 보여요(문서 근거 없는 일반적 판단, PoC 대상).
- 이 프로젝트는 웹 앱을 안 만들기로 했으므로 래핑의 장점(웹 재사용)도 없어요.

## 4. 스토어 배포·심사 (스택과 무관하게 해당)

- **Apple 3.2.1(viii)**: 금융 거래·투자·자산 관리 앱은 해당 서비스를 수행하는 금융기관이 제출해야 하고 필요한 라이선스가 있어야 한다고 적혀 있어요. 5.1.1(ix)는 금융 서비스 앱을 개인 개발자가 아닌 법인이 제출하라고 해요. oat는 거래를 중개하지 않는 기록·가계부 앱이지만 "money management"로 분류될 여지가 있어서, **출시 전에 개인/법인 계정 선택과 심사 메모를 따로 검토해야 해요.** (https://developer.apple.com/app-store/review/guidelines/)
- **Apple 5.1.1(v)**: 계정 생성을 지원하면 앱 안에서 계정 삭제를 제공해야 해요. 가구 단위 데이터 구조라 삭제 정책을 설계에 넣어야 해요.
- **Apple 2.5.2**: 기능을 바꾸는 코드를 내려받아 실행하면 안 돼요. OTA는 버그 수정·문구·스타일 같은 범위로 제한해서 운영하는 게 안전해요. Expo 문서도 플랫폼 규칙을 따라야 하고 동작 변경은 심사가 필요할 수 있다고 해요.
- **Google Play 타깃 API**: 2026-08-31부터 새 앱과 업데이트는 Android 16(API 36) 이상을 타깃해야 해요. (https://support.google.com/googleplay/android-developer/answer/11926878) PoC 때 각 스택의 기본 `targetSdkVersion`을 확인해야 해요.
- **Google Play 개인 계정**: 2023-11-13 이후 만든 개인 계정은 12명 테스터가 14일 동안 참여하는 비공개 테스트를 거쳐야 프로덕션 신청이 가능해요. 초대제 시작과 맞물려서 일정에 반영해야 해요. (https://support.google.com/googleplay/android-developer/answer/14151465)

## 5. 추천과 차순위

**추천: Expo(React Native)**
- 이유 1: TS 서버와 언어·검증 스키마·API 타입을 공유해서 1인 개발의 중복 작업이 가장 적어요.
- 이유 2: 이번 기준의 플랫폼 기능이 공식 모듈로 있어요. 위젯(`expo-widgets`), 생체인증, 푸시는 공식이고 공유 수신은 실험적 공식 모듈이 있어요.
- 이유 3: OTA 자체 서버까지 열려 있어 미니 PC 셀프호스팅 방침과 충돌하지 않아요.
- 조건: 위젯과 공유 수신의 성숙도, 입력 UX 품질이 PoC에서 확인돼야 해요. 안 되면 해당 조각만 Swift 확장으로 내려요.

**차순위: Flutter**
- UI 렌더링 일관성은 장점이지만, 위젯과 공유 확장을 네이티브로 써야 하고 TS 타입 공유가 안 돼 이번 조건(1인, TS 서버)에서 이점이 줄어요.

## 6. 후속 PoC에서 비교할 것 (앱 스택 PoC: 가계부 입력 화면 직접 써보기)

같은 입력 화면(금액 입력 + 카테고리 + 바텀시트 + 최근 항목 재사용)을 Expo와 Flutter로 만들어 실제 기기(iOS·Android 각 1대 이상)에서 비교해요.

1. 숫자/금액 입력: 천 단위 구분, 소수점·음수, 한글 키보드 전환, 키보드가 올라올 때 레이아웃 점프와 바텀시트 겹침
2. 바텀시트: 제스처, 키보드와 동시 사용, 스크롤 충돌 (Expo UI BottomSheet vs RN 라이브러리 vs Flutter 기본)
3. 홈 위젯: 이번 달 지출 요약 위젯을 만들 때 소요 시간과 코드량 (`expo-widgets` vs `home_widget`+SwiftUI/Glance), 데이터 갱신 방식
4. 공유 수신: 카드 문자 텍스트를 공유 시트로 받아 입력 화면에 채우기 (`expo-sharing` 실험 기능의 실제 안정성, iOS 공유 확장 동작)
5. 푸시: 셀프호스팅 서버에서 FCM/APNs 토큰으로 직접 발송, 백그라운드 수신
6. 생체인증: 앱 잠금 진입과 복귀 흐름
7. OTA: 자체 업데이트 서버(Expo Updates 프로토콜)를 미니 PC에 띄워 업데이트 1회 배포
8. 타입 공유: 서버의 zod 스키마를 앱에서 그대로 import하는 모노레포 구성과 빌드 마찰 (Flutter는 코드 생성 파이프라인 비용)
9. 빌드·배포: 로컬 빌드와 스토어 제출까지 걸린 시간, SDK 업그레이드 마찰
10. 체감 성능: 긴 거래 목록 스크롤과 앱 시작 시간

판정 기준은 "입력 완료까지 걸린 시간과 어색함", "네이티브 코드를 직접 건드려야 했던 횟수", "막혔을 때 공식 문서로 해결 가능했는지"예요.

## 7. 확인하지 못한 것

- `expo-widgets`와 `expo-sharing` 수신의 안정성 단계(문서에 stable 표기 없음)
- EAS Build/Update의 요금표, Shorebird 운영 주체·요금
- Flutter의 푸시·생체인증 패키지 1차 문서, Impeller 최신 상태
- Apple WidgetKit 문서 본문(페이지를 받지 못함)
- 금액 입력·키보드·바텀시트의 체감 품질 비교(문서 근거 없음, PoC로 확인)
