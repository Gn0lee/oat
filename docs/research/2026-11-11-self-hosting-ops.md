# 셀프호스팅 운영 스택 조사 (배포·모니터링·백업·버저닝)

- 작성일: 2026-11-11
- 대상 티켓: 셀프호스팅 운영 스택 (배포·모니터링·백업·버저닝), 지도 "oat 전면 개편 지도: 통합 원장·앱 우선·셀프호스팅"의 일부
- 전제: 미니 PC 1대(16GB RAM, 256GB SSD, 4코어, 고정 IP, 포트포워딩 가능, 내부 HDD), TS API 서버 + PostgreSQL + Redis, 운영자 1명, 짧은 중단 허용, 모니터링 필수, iOS/Android 앱
- 원칙: 공식 문서를 근거로 삼았고, 각 주장 옆에 출처를 달았어요. 공식 문서에서 확인하지 못한 항목은 "미확인"으로 표시했어요.

## 1. 결론 먼저

1. 배포는 **Docker Compose 한 벌**이 가장 단순해요. PaaS(Coolify 등)나 k3s는 1인·단일 호스트에서 움직이는 부품만 늘려요.
2. 외부 노출은 **Cloudflare Tunnel**(집 IP·인바운드 포트 비노출)이 기본이에요. 포트포워딩 + Caddy는 가능하지만 집 IP가 그대로 노출돼요.
3. 백업은 **pgBackRest(WAL 아카이빙 + 암호화) → 내부 HDD와 오프사이트 S3 호환(예: Backblaze B2)** 2중으로 해요. 복구 리허설을 분기마다 해요.
4. 모니터링은 **Uptime Kuma(외부 관점 가동 확인) + Healthchecks.io(크론·백업 dead man's switch) + 에러 추적은 호스팅형 Sentry 계열**을 권해요. 셀프호스팅 Sentry는 이 박스에 올리지 않아요.
5. 크론은 **API 서버 컨테이너 안 스케줄러(또는 별도 worker 컨테이너)로 옮기고**, 완료 신호를 Healthchecks.io로 보내요. GitHub Actions cron은 지연·중단 특성이 있어요.
6. 앱-API 호환은 **API 버전 + 최소 지원 앱 버전(서버 응답 헤더/엔드포인트) + 하위호환 우선 변경**으로 풀고, 강제 업데이트는 직접 구현해요. OTA는 Expo를 쓸 경우 runtime version 규칙에 맞춰요.

## 2. 배포 방식

### 후보 비교

| 후보 | 장점 | 1인 운영 관점 단점 |
|---|---|---|
| Docker Compose + 스크립트/CI | 파일 몇 개로 전체가 보여요. 재현·복구가 쉬워요 | 롤링 배포·자동 롤백은 직접 구성해야 해요 |
| Coolify 등 셀프호스팅 PaaS | UI, 원클릭 서비스 | 플랫폼 자체가 또 하나의 서비스예요. 공식 문서 첫 페이지에서는 요구 사양·구성요소·백업 기능을 확인하지 못했어요(미확인) |
| k3s/Kubernetes | 선언적 배포 | 단일 노드 1인에게는 과해요 |

Coolify는 "Docker로 패키징한 앱과 DB 이미지를 배포하는 플랫폼, 300개 이상 원클릭 서비스 템플릿, API·CLI·MCP 제공"까지만 공식 문서 랜딩에서 확인했어요. (출처: https://coolify.io/docs/)

### Compose 운영 기본기

- 재시작 정책은 `unless-stopped`를 써요. 정책은 컨테이너가 약 10초 이상 정상 실행된 뒤부터 적용돼요. (출처: https://docs.docker.com/engine/containers/start-containers-automatically/)
- 데몬 재시작·업그레이드 중에도 컨테이너를 유지하려면 `live-restore`가 있어요. 같은 문서에 나와요.
- **로그 로테이션은 기본 꺼져 있어요.** `json-file`은 기본 `max-size=-1`(무제한)이라 로그가 SSD(256GB)를 채울 수 있어요. `max-size=10m`, `max-file=3` 같은 값을 daemon.json에 꼭 지정해요. (출처: https://docs.docker.com/engine/logging/drivers/json-file/)
- **Docker 게시 포트는 ufw 규칙을 우회해요.** 컨테이너 포트는 nat 테이블에서 처리돼 ufw의 INPUT 체인에 닿기 전에 분기돼요. 그래서 Postgres·Redis는 `ports:`로 게시하지 말고 내부 네트워크에만 두거나 `127.0.0.1:`로 바인딩해야 해요(바인딩 방법 자체는 해당 문서 발췌에서 확인되지 않았으니 적용 시 Docker 포트 게시 문서로 재확인). (출처: https://docs.docker.com/engine/network/packet-filtering-firewalls/)

### CI/CD

- 권장: GitHub Actions에서 이미지를 빌드해 레지스트리(GHCR)에 푸시하고, 미니 PC는 `docker compose pull && up -d`로 가져와요(Tailscale/SSH 또는 소형 deploy 스크립트). 인바운드 접속 없이 미니 PC가 당겨오는 방식(Watchtower류)도 가능하지만 자동 업데이트는 마이그레이션 순서를 깨뜨릴 수 있어서 수동 승인 트리거를 권해요.
- 셀프호스티드 러너는 가능하지만 **OS와 소프트웨어 패치는 전적으로 운영자 책임**이고, 러너는 작업마다 깨끗한 환경이 보장되지 않아 이전 작업 상태가 남을 수 있어요. (출처: https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners) 공개 레포라면 피하는 편이 안전해요(해당 페이지에서는 확인 못 한 일반 보안 권고라 판단 근거는 위 두 사실이에요).
- DB 마이그레이션은 배포 시 서버 기동 전에 별도 one-shot 컨테이너로 실행하고, **앱 호환을 위해 expand → migrate → contract 순서의 하위호환 변경**만 해요(§7).

## 3. 리버스 프록시·TLS·외부 노출

### 옵션 A. Cloudflare Tunnel (권장)

- `cloudflared`가 **아웃바운드 연결만** 열어요. 원본 서버에 인바운드 리스너가 없고, 원본 IP나 포트를 인터넷에 노출할 필요가 없어요. 방화벽에서 인바운드를 전부 막아도 돼요. (출처: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- 공개 호스트명은 대시보드의 Tunnels > Routes > Published application에서 서비스 URL(예: `http://localhost:8000`)을 지정해 만들어요. 도메인은 먼저 Cloudflare에 추가돼 있어야 해요. (출처: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)
- TLS는 Cloudflare 엣지에서 종단되므로 인증서 갱신을 직접 신경 쓰지 않아도 돼요.
- 주의 1: Cloudflare는 비Enterprise 고객이 CDN으로 영상·대용량 파일을 제공하는 것을 제한할 수 있다고 약관에 명시해요. JSON API는 해당 없지만, 첨부파일/영수증 이미지를 대량으로 서빙할 계획이 있다면 별도 저장소(S3 호환 + 서명 URL)로 분리해요. (출처: https://www.cloudflare.com/service-specific-terms-application-services/ CDN 절. 이 페이지에는 Tunnel 항목이 없어서 Tunnel에 같은 조항이 적용되는지는 미확인)
- 주의 2: 무료 플랜 제공 여부와 한도는 확인한 공식 페이지에 없었어요(미확인). 도입 전 pricing 페이지로 확인해요.
- 주의 3: 모든 트래픽이 Cloudflare를 경유하므로 가용성과 프라이버시 면에서 제3자 의존이 생겨요. 금융 앱이라 응답 본문이 Cloudflare 엣지에서 복호화된다는 점을 수용할 수 있는지 판단이 필요해요.

### 옵션 B. 포트포워딩 + Caddy

- Caddy는 공개 도메인에 대해 ACME(Let's Encrypt, ZeroSSL)로 인증서를 자동 발급·갱신하고 HTTP를 HTTPS로 리디렉션해요. 80/443 포트가 외부에서 접근 가능해야 하고, 데이터 디렉터리는 영속이어야 해요. DNS 챌린지를 쓰면 인바운드 포트 없이 발급할 수 있어요. (출처: https://caddyserver.com/docs/automatic-https)
- 단점: 집 공인 IP가 DNS에 드러나요. DDoS·스캔 노출과 ISP 정책(80/443 차단 여부)은 운영자 몫이에요. 고정 IP라 DDNS는 필요 없어요.
- 보완: fail2ban/crowdsec, 레이트 리밋, 관리 포트(SSH)는 인터넷에 열지 않기(Tailscale 등).

### 노출 정책 (공통)

- 인터넷에는 API(443)만 보이게 해요. Postgres/Redis/모니터링 UI는 내부 네트워크 또는 VPN 뒤에 둬요.
- SSH는 키 인증만 쓰고, 관리 접근은 VPN(Tailscale/WireGuard)으로 해요. 구체 제품 선택은 이 조사에서 공식 문서로 검증하지 않았어요(미확인).

## 4. 모니터링과 장애 알림

| 목적 | 도구 | 근거 |
|---|---|---|
| 외부 관점 가동·응답 확인 | Uptime Kuma (HTTP, TCP, 키워드, JSON Query, Docker 컨테이너, Push 모니터. 알림은 Telegram, Discord, Slack, SMTP 등) | https://github.com/louislam/uptime-kuma |
| 크론·백업 "안 돌았음" 감지 | Healthchecks.io (ping URL, `/start` `/fail` 신호, grace time, 이메일·Slack·웹훅·SMS 등. 셀프호스팅 문서도 있음) | https://healthchecks.io/docs/ |
| 에러 추적 | 호스팅형 Sentry 계열 권장 | 아래 |

- **Uptime Kuma를 같은 미니 PC에 두면 PC 전체가 죽을 때 같이 죽어요.** 진짜 알림이 필요한 "호스트 다운" 감지는 외부(호스팅형 업타임 서비스 또는 Healthchecks.io의 heartbeat)에서 해야 해요. 미니 PC가 주기적으로 ping을 보내고, 끊기면 외부 서비스가 알려주는 구조(dead man's switch)가 가장 확실해요.
- Uptime Kuma는 Docker 이미지 `louislam/uptime-kuma:2`로 실행하고 `/app/data` 볼륨이 필요하며, NFS 같은 네트워크 파일시스템은 지원하지 않아요. 로컬 접근만 허용하려면 포트를 127.0.0.1에 바인딩해요. 요구 메모리는 공식 페이지에 없어요(미확인).
- **셀프호스팅 Sentry는 비권장**: 최소 4코어, RAM 16GB + 스왑 16GB, 디스크 20GB이고 공식은 32GB를 권장해요. DB·메시지 브로커를 한 머신에서 돌려 디스크 I/O 의존이 크고 지원 보증도 없어요. 이 미니 PC의 전체 RAM을 혼자 쓰게 되므로 맞지 않아요. (출처: https://develop.sentry.dev/self-hosted/) 대안은 호스팅형 에러 추적의 무료 구간이에요(조건은 도입 시 확인).
- 호스트 메트릭(디스크·메모리·SMART)은 가벼운 에이전트로 충분해요. Prometheus + Grafana 풀 스택은 1인 운영에는 과하다는 게 이 문서의 판단이에요(공식 문서 근거 없는 의견).
- 필수 알림 목록: API 헬스(외부), 디스크 사용률 80%, 백업 실패/미실행, 크론 미실행, 인증서·도메인 만료, WAL 아카이브 실패(§5).

## 5. PostgreSQL 백업·복구

### 방식

- **논리 백업(pg_dump)**: 단순하지만 시점 복구가 안 돼요. 공식 문서도 PITR은 파일시스템 수준 베이스 백업 + WAL이 필요하고 pg_dump 출력으로는 할 수 없다고 해요.
- **연속 아카이빙 + PITR**: 베이스 백업과 WAL(16MB 세그먼트) 아카이브를 합쳐 베이스 백업 이후 임의 시점으로 복구해요. 복구는 클러스터 전체 단위예요. (출처: https://www.postgresql.org/docs/current/continuous-archiving.html)
- 위험: **아카이빙이 실패하면 `pg_wal/`이 계속 늘고, 디스크가 차면 PostgreSQL이 PANIC으로 종료돼요.** 아카이브 실패 알림이 필수예요. `postgresql.conf` 등 설정 파일은 WAL에 포함되지 않으니 따로 보관해요. 같은 문서.
- **pgBackRest**: full/differential/incremental, 별도 WAL 아카이브 보존, 로컬·S3 호환·SFTP·GCS·Azure 저장소, **여러 저장소 동시 사용**, 클라이언트 측 암호화(aes-256-cbc), PITR, `info`·`verify` 명령. 암호화 설정은 stanza 생성 후 변경할 수 없어요. S3는 `repoN-type=s3`, bucket/endpoint/region/key 옵션을 써요. (출처: https://pgbackrest.org/user-guide.html. `verify` 상세는 읽은 구간에 없어서 미확인)

### 권장 구성 (3-2-1에 가깝게)

1. 원본: SSD의 Postgres 데이터.
2. repo1: 내부 HDD(pgBackRest 로컬 저장소). 주 1회 full + 일 1회 differential/incremental + WAL 상시 아카이브.
3. repo2: 오프사이트 S3 호환(암호화). 같은 pgBackRest에서 두 번째 저장소로 설정해요.
4. 규모가 작으면(가구 단위 가계부 데이터) 단순 대안으로 매일 `pg_dump` + 암호화 후 업로드도 가능하지만 RPO가 최대 하루예요.

### 오프사이트 비용

- Backblaze B2: 저장 $6.95/TB/월부터, 최초 10GB 무료, 이그레스는 월 평균 저장량의 3배까지 무료이고 초과 시 $0.01/GB, 최소 용량·최소 보관기간 요금 없음. 가계부 규모(수 GB 이하)라면 사실상 무료~월 몇 백 원 수준이에요. (출처: https://www.backblaze.com/cloud-storage/pricing)
- 암호화는 클라이언트 측(pgBackRest 암호문)으로 해서 저장소 제공자가 평문을 못 보게 해요. 패스프레이즈는 서버 밖(비밀번호 관리자 + 종이)에 보관해요. 패스프레이즈를 잃으면 백업 전체를 못 써요.
- 다른 S3 호환 제공자와의 가격 비교는 이 조사에서 공식 가격표로 확인하지 않았어요(미확인).

### Redis

- 용도를 먼저 정해요. **캐시·레이트리밋·큐 잡 상태 정도면 영속성을 꺼도 되고**, 잃으면 안 되는 데이터는 Postgres에 둬요. 정본 데이터를 Redis에만 두지 않는 게 가장 단순한 백업 전략이에요.
- 영속성이 필요하면 공식 권장은 PostgreSQL에 준하는 안전성을 원할 때 RDB + AOF 병행, 몇 분의 손실을 감수할 수 있으면 RDB 단독이에요. AOF 기본 fsync는 everysec(최대 1초 손실). RDB 파일은 실행 중 복사해도 안전하고, 하루 한 번 이상 머신 밖으로 내보내라고 해요. (출처: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

### 복구 리허설

- 공식 문서도 아카이빙 절차를 첫 베이스 백업 전에 테스트하라고 하고, 복구 후 데이터를 확인하라고 해요. (출처: PostgreSQL 연속 아카이빙 문서)
- Redis 문서는 전송 후 파일 크기·해시 검증과, 백업이 안 올라갔을 때 알리는 **독립된 알림 체계**를 요구해요. 이 문서의 해석: 백업 성공 시 Healthchecks.io에 ping, 실패·미실행 시 알림.
- 권장 리허설 절차(분기 1회 + 스키마 큰 변경 후):
  1. 별도 컨테이너/임시 디렉터리에 최신 오프사이트 백업을 `pgbackrest restore`로 복원(PITR 시점 하나 지정).
  2. 주요 테이블 행 수, 최신 거래 시각, 샘플 쿼리 비교.
  3. 소요 시간을 기록(RTO 측정)하고 런북에 반영.
  4. 미니 PC 전손 가정: 새 장비에서 Compose 파일 + 시크릿 + 오프사이트 백업만으로 복구 가능한지 확인. 그러려면 Compose 파일·`.env`·인증 키의 보관 위치(비밀번호 관리자, 레포의 암호화본)가 정해져 있어야 해요.

## 6. 크론(환율·종목 마스터·휴장일) 실행 위치

| 위치 | 장점 | 단점 |
|---|---|---|
| GitHub Actions cron (현행) | 서버와 분리돼 서버 장애와 무관 | 최소 5분 간격. 부하 시 지연·일부 작업 누락 가능. 공개 레포는 60일간 활동이 없으면 자동 비활성화. 기본 브랜치에서만 실행. 서버 DB에 접근하려면 외부 노출 또는 API 경유가 필요 |
| 서버 내부 스케줄러 / 별도 worker 컨테이너 | DB·Redis에 직접 접근, 노출 경로 불필요, 로그 한 곳 | 서버가 죽으면 같이 멈춰요 |

(출처: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

- 권장: **서버 쪽으로 이전**해요. 2시간마다 환율, 매일 종목 마스터, 주간 휴장일은 부하가 작아요. API 프로세스와 분리된 worker 컨테이너에서 실행하고(API 재시작과 무관), 작업은 멱등(UPSERT)으로 만들어요(현행 방식도 UPSERT).
- 실행마다 Healthchecks.io에 `/start`와 성공 ping을 보내 **누락도 알림**이 가도록 해요. grace time은 주기보다 길게 잡아요. (출처: https://healthchecks.io/docs/)
- 미니 PC가 꺼져 있던 동안 놓친 실행은 기동 시 catch-up(마지막 성공 시각 기준 재실행)으로 보충해요.
- 큐(BullMQ 등) 도입 여부는 서버 아키텍처 티켓의 몫이고, 이 용도만으로는 불필요해요.

## 7. 앱 버전과 API 버전 호환

스토어 앱은 사용자가 업데이트하기 전까지 구버전이 계속 존재하므로, **서버는 구버전 앱을 일정 기간 지원해야 해요.**

### API 호환 규칙

- 하위호환 우선: 필드 추가는 허용하고, 삭제·의미 변경은 새 버전 경로(`/v2/...`)나 새 필드로 해요. 오래된 클라이언트가 모르는 필드를 무시하도록 클라이언트도 구현해요.
- DB 변경은 expand → migrate → contract 3단계로 나눠 배포 사이에 구버전 앱·서버가 모두 동작하게 해요.
- 모든 요청에 앱 버전·플랫폼 헤더(예: `X-App-Version`)를 붙이고, 서버는 로그·지표에 남겨 **구버전 비율**을 보고 지원 종료 시점을 정해요.

### 강제/권장 업데이트

- Android: Play의 in-app updates가 flexible(백그라운드 다운로드, 사용 지속)과 immediate(전체화면, 앱 재시작 필수) 두 흐름을 제공해요. 치명적 변경에는 immediate를 써요. Android 5.0(API 21) 이상, 모바일·태블릿·ChromeOS 지원. (출처: https://developer.android.com/guide/playcore/in-app-updates)
- iOS: 이 조사에서 Apple 공식 문서로 대응되는 네이티브 강제 업데이트 API를 확인하지 못했어요(조회한 문서 URL이 404). 미확인이므로, 직접 구현하는 것으로 가정해요.
- 플랫폼 공통 직접 구현안: 서버가 `min_supported_version`(강제)과 `latest_version`(권장)을 플랫폼별로 반환하는 엔드포인트를 두고, 앱 기동 시 비교해 차단 화면/배너를 띄워요. 서버는 최소 버전 미만 요청에 `426 Upgrade Required` 같은 명시적 오류로 응답할 수도 있어요(설계 선택). 이 방식은 OS 독립적이라 Android/iOS 모두 같아요.

### OTA (Expo를 쓰는 경우에 한함)

- 클라이언트 스택이 아직 정해지지 않았으므로 조건부 사항이에요. React Native/Expo를 택하면 아래가 적용돼요.
- **runtime version**이 일치할 때만 업데이트가 로드돼요. 네이티브 코드가 바뀌면 새 스토어 빌드와 새 runtime version이 필요해요. 정책은 `appVersion`(네이티브가 바뀔 때 앱 버전을 올려야 함)과 `fingerprint`(네이티브 영향 코드 해시, 호환 실패 위험이 낮지만 빌드가 잦음). 단계적 롤아웃, 프리뷰 채널으로 안전장치를 두라고 안내해요. (출처: https://docs.expo.dev/eas-update/runtime-versions/)
- 롤아웃은 `--rollout-percentage`로 비율 지정, `eas update:revert-update-rollout`·`eas update:rollback` 등으로 되돌려요. 브랜치당·플랫폼당·runtime version당 활성 롤아웃은 1개예요. (출처: https://docs.expo.dev/eas-update/rollouts/)
- 셀프호스팅 업데이트 서버 지원 여부는 읽은 페이지에 없어요(미확인). 기본은 EAS Update(호스팅)로 가정해요.
- OTA는 JS/에셋 수정에만 써요. **API 호환 문제를 OTA에 의존해 풀지 않고**, 위 호환 규칙과 강제 업데이트 게이트를 1차 방어로 둬요(스토어 정책의 OTA 허용 범위는 이 조사에서 미확인).

## 8. 버저닝 규칙과 릴리스 흐름

- 앱·서버 모두 SemVer를 따라요: MAJOR=비호환 API 변경, MINOR=하위호환 기능 추가·deprecation, PATCH=하위호환 버그 수정. 0.x는 초기 개발로 안정 API를 약속하지 않고, 배포된 버전의 내용은 바꾸지 않아요. (출처: https://semver.org/)
- 구분: **앱 버전(스토어 표기)**, **서버 버전(이미지 태그)**, **API 버전(URL/헤더)** 은 서로 다른 축이에요. 앱 버전은 사용자에게 보이는 마케팅 버전, 호환 판단은 `min_supported_version`과 API 버전으로 해요.
- 이미지 태그는 `vX.Y.Z`와 커밋 SHA를 함께 붙이고, 배포 기록(어떤 태그가 언제)을 남겨 롤백 대상을 명확히 해요. 롤백은 이전 태그로 `compose up`.
- 릴리스 흐름(1인용 최소안): main 머지 → CI가 테스트·이미지 빌드 → 수동 승인으로 미니 PC 배포(마이그레이션 먼저) → 헬스체크 통과 확인 → 앱은 스토어 단계적 출시 또는 OTA 롤아웃. 변경 이력은 Conventional Commits에서 CHANGELOG를 생성하는 방식을 선택지로 두되, 이 문서는 해당 도구를 공식 문서로 검증하지 않았어요(미확인).

## 9. RAM 예산 (16GB 기준, 추정치)

아래는 공식 문서에서 확인한 수치가 아니라 규모 가정(가구 단위 소규모, 초대제)에 따른 대략적 계획값이에요. 실측으로 대체해야 해요.

| 구성요소 | 계획값 |
|---|---|
| OS + Docker | 1 GB |
| PostgreSQL (`shared_buffers` 2GB 포함) | 3 GB |
| Redis (캐시 용도) | 0.5 GB |
| TS API + worker | 1 GB |
| cloudflared / Caddy | 0.2 GB |
| Uptime Kuma + 에이전트 | 0.5 GB |
| 여유(페이지 캐시, 복구 리허설, 일시 급증) | 약 9 GB |

셀프호스팅 Sentry는 단독으로 16GB + 스왑 16GB를 최소로 요구하므로 이 표에 들어갈 수 없어요(§4).

## 10. 권장 기준 스택 (Baseline)

- **런타임**: Docker Compose (`api`, `worker`, `postgres`, `redis`, `cloudflared`, `uptime-kuma`). 모든 서비스 `restart: unless-stopped`, 로그 로테이션 설정, DB·Redis는 내부 네트워크만.
- **노출**: Cloudflare Tunnel로 API 호스트명만 공개. 인바운드 포트 전부 차단. 관리는 VPN.
- **배포**: GitHub Actions에서 빌드·테스트 → GHCR 푸시 → 수동 승인 후 미니 PC에서 pull·마이그레이션·up. 롤백은 이전 태그.
- **백업**: pgBackRest (repo1 = 내부 HDD, repo2 = B2 같은 S3 호환 오프사이트, 클라이언트 암호화), 백업 성공마다 Healthchecks.io ping. Redis는 영속성 불필요하게 설계, 필요 시 RDB만 일 1회 오프사이트 복사. 분기 1회 복구 리허설.
- **모니터링**: 외부에서 보는 업타임 + Healthchecks.io heartbeat(호스트 생존 포함) + Uptime Kuma(상세 체크) + 호스팅형 에러 추적. 알림은 모바일 푸시 가능한 채널(Telegram/Slack 등) 하나로 통일.
- **크론**: worker 컨테이너 내 스케줄러, 멱등 UPSERT, 실행마다 Healthchecks.io 신호, 기동 시 catch-up.
- **버저닝**: SemVer, API는 하위호환 우선 + `/v1`, 서버가 `min_supported_version`·`latest_version` 제공, 앱은 기동 시 게이트. OTA는 Expo 선택 시 runtime version 정책을 `fingerprint`(또는 `appVersion`)로 고정.

## 11. 대안과 선택 기준

| 항목 | 기준안 | 대안 | 대안을 택할 조건 |
|---|---|---|---|
| 노출 | Cloudflare Tunnel | 포트포워딩 + Caddy(+crowdsec) | 제3자 경유(본문 복호화) 불가, 또는 Tunnel 약관·요금이 맞지 않을 때 |
| 배포 | Compose + CI | Coolify | UI·원클릭 서비스가 꼭 필요하고 플랫폼 운영 부담을 감수할 때 (사양·백업 기능은 도입 전 재확인) |
| 백업 | pgBackRest | pg_dump 일 1회 + 암호화 업로드 | RPO 하루를 허용하고 설정 복잡도를 최소화하고 싶을 때 |
| 오프사이트 | S3 호환(B2 등) | 원격 VPS에 SSH 전송 | 클라우드 계정을 줄이고 싶을 때. Redis 문서는 서로 다른 두 곳에 두라고 권해요 |
| 에러 추적 | 호스팅형 | 로그 + Uptime Kuma만 | 초기 단계에서 비용·가입을 최소화할 때 |
| 크론 | worker 컨테이너 | GitHub Actions 유지 + API 호출 | 서버와 독립된 실행 주체가 필요하고 지연·누락을 감수할 수 있을 때 |
| 오케스트레이션 | Compose | k3s | 다중 노드 확장이 현실화될 때만 |

## 12. 미확인·후속 확인 항목

- Cloudflare Tunnel 무료 플랜 한도와 Tunnel 경유 트래픽에 대한 약관 적용 범위.
- iOS의 공식 업데이트 유도 수단(스토어 정책·API) 및 OTA 허용 범위.
- Coolify의 요구 사양·구성요소·백업 기능.
- pgBackRest `verify` 동작, 다른 오프사이트 제공자의 가격 비교.
- VPN(Tailscale/WireGuard) 및 호스팅형 에러 추적/업타임 서비스의 무료 구간 조건.
- 위 RAM 예산은 실측 필요. 백업 리허설의 실제 RTO는 첫 리허설에서 측정.
