import { getSystemConfigClient } from "./system-config-client";

/**
 * 시스템 락(Mutex) 획득 시도
 *
 * Atomic Operation:
 * - 키가 없으면 INSERT (락 획득)
 * - 키가 있고 만료되었으면 UPDATE (락 탈취/갱신)
 * - 키가 있고 유효하면 아무것도 안 함 (락 획득 실패)
 *
 * @param key 락 식별자 (예: 'kis_token')
 * @param ttlSeconds 락 유효 시간 (초), 기본 60초
 * @returns 락 획득 성공 여부
 */
export async function acquireLock(
  key: string,
  ttlSeconds = 60,
): Promise<boolean> {
  const supabase = getSystemConfigClient();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  // Supabase SDK 한계로 인해, '만료된 것 삭제' 후 '삽입' 전략 사용
  // 1. 만료된 락 삭제

  // Supabase SDK 한계로 인해, '만료된 것 삭제' 후 '삽입' 전략 사용
  // 1. 만료된 락 삭제
  await supabase
    .from("system_locks")
    .delete()
    .eq("key", key)
    .lt("expires_at", new Date().toISOString());

  // 2. 락 삽입 시도
  const { error: insertError } = await supabase.from("system_locks").insert({
    key,
    expires_at: expiresAt,
  });

  // 에러가 없고 성공했으면 true (Primary Key 충돌 나면 error 발생)
  if (!insertError) {
    return true;
  }

  // PK 중복 에러(23505)라면 락 획득 실패
  if (insertError.code === "23505") {
    return false;
  }

  console.error(`[Lock] Error acquiring lock for ${key}:`, insertError);
  return false;
}

/**
 * 시스템 락 해제
 */
export async function releaseLock(key: string): Promise<void> {
  const supabase = getSystemConfigClient();
  await supabase.from("system_locks").delete().eq("key", key);
}

/**
 * 시스템 락을 사용하는 안전한 실행 래퍼 (Wrapper)
 *
 * @param key 락 키
 * @param task 실행할 작업 (Promise)
 * @param options 설정 객체
 *   - ttl: 락 유효 시간 (초)
 *   - maxRetries: 최대 재시도 횟수 (기본 20회)
 *   - retryIntervalMs: 재시도 간격 (기본 500ms) -> 총 10초 대기
 */
export async function withSystemLock<T>(
  key: string,
  task: () => Promise<T>,
  options: {
    ttl?: number;
    maxRetries?: number;
    retryIntervalMs?: number;
  } = {},
): Promise<T> {
  const { ttl = 60, maxRetries = 20, retryIntervalMs = 500 } = options;
  let retries = 0;

  while (retries < maxRetries) {
    // 1. 락 획득 시도
    const acquired = await acquireLock(key, ttl);

    if (acquired) {
      try {
        // 2. 작업 실행
        return await task();
      } finally {
        // 3. 작업 종료 후 무조건 락 해제
        await releaseLock(key);
      }
    }

    // 락 획득 실패: 대기 후 재시도
    retries++;
    await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
  }

  throw new Error(
    `[Lock] Failed to acquire lock for '${key}' after ${maxRetries} retries`,
  );
}
