# PROTOTYPE — 앱 스택 PoC: 가계부 입력 화면

버리는 코드예요. 이 브랜치(`prototype/expo-input-poc`)는 어디에도 합치지 않아요.
결정과 통과 기준은 [앱 스택 PoC: 가계부 입력 화면 직접 써보기](https://github.com/Gn0lee/oat/issues/521)에 있어요.

| 폴더 | 내용 |
|---|---|
| `expo-input/` | Expo SDK 58 (RN 0.88, New Architecture). CNG + Xcode 로컬 빌드, EAS 미사용 |
| `swiftui-input/` | 같은 화면의 SwiftUI 기준점. 비교용으로만 써요 |

두 앱은 같은 화면이에요: 금액 키패드(누르는 순간 입력, `00`, 쉼표 실시간, 햅틱, ⌫ 길게 누르면 전체 삭제), 결제수단·카테고리 시트(긴 목록), 메모, 저장(메모리 목록).
화면 위 회색 **PoC 바**는 비교용 스위치와 상태 표시예요.

## 준비 (한 번만)

1. App Store에서 **Xcode** 설치 → 한 번 실행해서 추가 구성요소 설치 → `sudo xcode-select -s /Applications/Xcode.app`
2. Xcode → Settings → Accounts에 Apple ID 추가 (무료 개인 팀으로 실기기 7일 서명 가능)
3. iPhone: 설정 → 개인정보 보호 및 보안 → **개발자 모드** 켜기, 케이블로 맥에 연결
4. `brew install cocoapods xcodegen`

## Expo 버전 실행

```bash
cd poc/expo-input
npm install
npx expo run:ios --device                          # 개발 빌드: 연결된 iPhone 선택
npx expo run:ios --device --configuration Release  # 판정(콜드 스타트·손맛)은 Release로
```

- 처음 실행하면 `ios/` 폴더가 생겨요(CNG). 손으로 고치지 않아요.
- 서명 오류가 나면 `ios/*.xcworkspace`를 Xcode로 열고 Signing & Capabilities에서 Team을 개인 팀으로 고른 뒤 다시 실행해요.
- PoC 바: **시트** `true-sheet`(iOS 네이티브 시트) / `gorhom`(JS 시트), **메모** `rn`(RN TextInput) / `swiftui`(@expo/ui TextField)

## SwiftUI 버전 실행

```bash
cd poc/swiftui-input
xcodegen          # OatSwiftUIPoC.xcodeproj 생성
open OatSwiftUIPoC.xcodeproj
```

Xcode에서 Team을 개인 팀으로 고르고, 실행 대상을 iPhone으로 바꾼 뒤 ▶︎. 판정은 Product → Scheme → Edit Scheme → Run → Build Configuration을 Release로 바꾸고 해요.

## 판정 방법 (통과 기준 1~7)

| # | 방법 |
|---|---|
| 1 키패드 연타 | 탭 카운터를 0으로 → `1`을 빠르게 20번 (두 손가락으로 번갈아, 앞 손가락을 떼기 전에 누르기 포함) → 탭 수 = 20이고 자릿수가 맞는지. 10자리가 최대라 ⌫를 섞어도 돼요. SwiftUI와 번갈아 비교 |
| 2 한글 메모 | `rn`과 `swiftui` 각각에서 "점심 김치찌개 했어요"를 빠르게 치기, 중간 지우기, 40자 근처에서 치기 → 자모가 분리되거나 사라지면 실패 |
| 3 바텀시트 | 시트 열기 → 목록 끝까지 스크롤 → 위로 스크롤하다 끝에서 그대로 아래로 끌어 닫기 / 60% ↔ 전체 전환 → 튐·멈춤 여부. `true-sheet`, `gorhom`, SwiftUI 셋 비교 |
| 4 키패드↔키보드 | 금액 입력 → 메모 탭(키패드 사라지고 키보드) → 저장 버튼이 키보드 위에 보이는지 → 금액 탭해서 키패드 복귀 |
| 5 VoiceOver | 설정 → 손쉬운 사용 → VoiceOver 켜고 금액 입력부터 저장까지 |
| 6 콜드 스타트 | Release 빌드, 앱 완전 종료 후 아이콘 탭 → 금액 입력 가능까지 (화면 녹화로 프레임 세기) |
| 7 로컬 빌드 | 위 실행 과정이 EAS 없이 막힘없이 됐는지, 코드 수정 후 반영(개발 빌드의 Fast Refresh) |
