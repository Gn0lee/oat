# 전환 PoC: 비밀번호 해시 이전과 전환 직후 안내 목업

- 날짜: 2026-11-25
- 티켓: [전환 당일 절차: 순서·되돌리기·계정 이전·안내](https://github.com/Gn0lee/oat/issues/533)
- 결과 문서: [전환 당일 절차](../design/cutover.md), ADR 0032

## 무엇을 직접 해 보고 무엇을 조사로 대신했나

| 항목 | 방식 | 결과 |
|---|---|---|
| 비밀번호 해시 이전 | PoC(`2026-11-25-cutover-poc/auth-hash`) | 11개 통과 |
| 전환 직후 안내 화면 | 목업(`2026-11-25-cutover-poc/after-cutover-mockup.html`) | 택하지 않음(운영자 본인이라 불필요) |
| 쓰기 중지 스위치 | 계획했다가 뺌 | 운영자가 직접 멈춤(다른 이용자 없음) |
| 순서·되돌리기·보관 기간·배포 경로 | 기존 설계 문서와 일반 지식 | 설계 문서 3·5·7절 |
| 매핑·검증 스크립트 | 이미 PoC 완료([기존 데이터 전환 PoC](2026-11-17-legacy-migration-poc.md)) | 다시 하지 않음 |

## 비밀번호 해시 이전 PoC

- 실행: `docker run -d --name cut533-pg -e POSTGRES_PASSWORD=poc -e POSTGRES_DB=auth -p 55433:5432 postgres:17` 뒤 `cd auth-hash && npm install && npm test`. 결과는 `auth-hash/output.txt`.
- Better Auth 1.7.25, `bcryptjs` 3.0.2, Postgres 17.
- Supabase(GoTrue)는 Go bcrypt로 `$2a$10$…` 해시를 `auth.users.encrypted_password`에 둬요. PoC는 pgcrypto `crypt(pw, gen_salt('bf', 10))`로 같은 꼴의 해시를 만들었어요. 실제 Supabase 계정 해시로는 하지 않았어요(전환 리허설에서 확인).
- 전환 스크립트가 할 일을 흉내 냈어요: `user` 행 + `account` 행(`providerId = 'credential'`, `accountId = userId`, `password = 해시 그대로`).

| # | 확인 | 결과 |
|---|---|---|
| 1~3 | 해시 꼴 `$2a$10$` | 통과 |
| 4 | 인증된 사용자가 기존 비밀번호로 로그인 | 통과 |
| 5 | 틀린 비밀번호 거절 | 통과(`INVALID_EMAIL_OR_PASSWORD`) |
| 6 | 미인증 사용자는 비밀번호가 맞아도 거절 | 통과(`EMAIL_NOT_VERIFIED`) → 인증 여부를 꼭 옮겨요 |
| 7 | **6자** 기존 비밀번호도 로그인 | 통과. Supabase 기본 최소 6자, Better Auth 8자. 길이 검사는 새로 정할 때만 |
| 8 | 비밀번호 변경 → 저장 해시가 scrypt | 통과. 처음엔 새 비밀번호가 7자라 `PASSWORD_TOO_SHORT`로 실패해서 고쳤어요 |
| 9 | 변경 뒤 옛 비밀번호 거절, 새 비밀번호 로그인 | 통과 |
| 10 | bcrypt 계정의 재설정 메일 → 새 비밀번호(scrypt) 로그인 | 통과 |
| 11 | bcrypt(10) 비교 시간 | 70~200ms(로그인 한 번에 한 번) |

## 전환 직후 안내 목업

첫 로그인, 처음 한 번 보는 "기록을 모두 옮겨 왔어요" 화면, 홈 "확인할 것"의 전환 할 일(잔액 넣기·이용기간 확인), 잔액 넣기 시트를 그렸어요. 사용자는 운영자 본인이고 데이터가 같게 옮겨지고 로그인만 똑같이 되면 된다고 해서 택하지 않았어요. 남은 일은 설계 문서 9절의 운영자 할 일이에요.

## 한계

- 실제 Supabase가 만든 해시가 아니라 같은 꼴의 해시로 확인했어요. 리허설(설계 문서 4절)에서 운영자 계정의 실제 해시로 로그인해 봐요.
- 메일 발송은 콜백으로 토큰만 받았어요. 실제 메일 도착은 전환 전 조건(설계 문서 2절)에서 확인해요.
- 미인증 계정에 인증 메일을 보내는 경로(`sendVerificationEmail`)는 확인하지 않았어요. 그래서 "두 계정 모두 인증됨"을 전환 전 조건으로 뒀어요.
