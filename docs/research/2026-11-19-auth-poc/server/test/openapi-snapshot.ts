// #9: Better Auth openAPI() 출력이 실행마다 같은지, 숨김 엔드포인트가 들어가는지 확인해요.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { auth } from "../src/auth.js";
const schema = await auth.api.generateOpenAPISchema();
const text = JSON.stringify(schema, null, 2);
const out = process.argv[2] ?? "/dev/null";
writeFileSync(out, text);
const paths = Object.keys((schema as any).paths);
console.log("sha256", createHash("sha256").update(text).digest("hex").slice(0, 16), "paths", paths.length);
console.log("expo proxy 포함:", paths.filter((p) => p.includes("expo")));
console.log("oauth2/mcp 경로 수:", paths.filter((p) => p.includes("oauth2")).length, "| /token 포함:", paths.includes("/token"));
await (await import("../src/auth.js")).pool.end();
