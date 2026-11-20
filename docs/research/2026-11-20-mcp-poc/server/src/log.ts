// 관찰 기록: 실제 클라이언트가 무엇을 보냈는지 poc-log.jsonl에 한 줄씩 남겨요.
import { appendFileSync } from "node:fs";

const file = new URL("../poc-log.jsonl", import.meta.url);

export function log(event: string, data: Record<string, unknown> = {}) {
	const line = JSON.stringify({ at: new Date().toISOString(), event, ...data });
	appendFileSync(file, `${line}\n`);
	console.log(line.length > 400 ? `${line.slice(0, 400)}…` : line);
}
