import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("development seed", () => {
  it("uses UUIDs accepted by API validation", () => {
    const sql = readFileSync("supabase/seed.sql", "utf8");
    const ids = [...sql.matchAll(/'([0-9a-f-]{36})'/gi)].map(([, id]) => id);

    expect(ids.filter((id) => !z.uuid().safeParse(id).success)).toEqual([]);
  });
});
