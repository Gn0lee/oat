---
name: ui-work
description: UI 컴포넌트, 화면, 스타일링, 디자인 관련 작업 시 사용. "화면 구현", "컴포넌트 생성", "UI", "디자인", "스타일", "레이아웃" 등의 요청에 활성화됩니다.
---

# UI 작업 가이드

이 작업을 시작하기 전에 반드시 다음 문서를 읽어주세요:

@.claude/docs/DESIGN.md
@.claude/docs/CONVENTIONS_FE.md

## 핵심 규칙

### 디자인 원칙 (토스 스타일)
- 큰 숫자 강조
- 충분한 여백
- 직관적인 흐름

### 기술 스택
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod (폼)
- TanStack Query (서버 상태)
- Zustand (클라이언트 상태)

### 파일 네이밍
- 컴포넌트: `PascalCase.tsx` (예: `AssetCard.tsx`)
- 훅: `use-kebab-case.ts` (예: `use-assets.ts`)

### 컴포넌트 구조
```tsx
// 1. imports
// 2. types (컴포넌트 전용 타입은 같은 파일에)
// 3. component
// 4. export
```
