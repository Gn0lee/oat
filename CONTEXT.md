# Oat

Oat is a household finance context for tracking family assets and ledger records while preserving a distinction between shared household activity and each member's own activity.

## Language

**내 기록 공백**:
현재 사용자가 작성한 가계부 기록이 최근 7일 동안 없는 상태.
_Avoid_: 가구 기록 공백, 전체 기록 없음

## Relationships

- **내 기록 공백** is evaluated from the current user's own ledger records created in the last 7 days, not all household ledger records or transaction dates.
- **내 기록 공백** treats expense, income, and transfer ledger records as activity.
- Home surfaces **내 기록 공백** with direct guidance, not a separate primary action area; only the action phrase at the end of the sentence is linked.
- Home distinguishes first-time ledger absence from resumed ledger absence.

## Example dialogue

> **Dev:** "배우자가 이번 주에 공용 지출을 기록했으면 홈에서 기록 유도를 숨길까요?"
> **Domain expert:** "아니요. 이 유도는 현재 사용자의 기록 습관을 돕는 것이므로 내 기록이 없으면 보여줍니다."

## Flagged ambiguities

- "최근 기록 없음" was used ambiguously between household-wide records and the current user's records — resolved: use **내 기록 공백**.
