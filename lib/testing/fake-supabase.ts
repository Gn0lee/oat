// Test-only in-memory stand-in for the PostgREST query builder. Rows passed in
// are treated as already RLS-visible to the caller; filters are applied so a
// test can assert on real aggregation results instead of mock call shapes.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export type FakeTables = Record<string, Row[]>;

class FakeQuery
  implements
    PromiseLike<{
      data: Row[] | Row | null;
      error: null;
      count: number | null;
    }>
{
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private window: [number, number] | null = null;
  private mode: "many" | "maybeSingle" | "single" = "many";
  private wantsCount = false;

  constructor(private readonly rows: Row[]) {}

  select(_columns?: string, options?: { count?: string }) {
    this.wantsCount = Boolean(options?.count);
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  gte(column: string, value: string) {
    this.filters.push((row) => compare(row[column], value) >= 0);
    return this;
  }
  lt(column: string, value: string) {
    this.filters.push((row) => compare(row[column], value) < 0);
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }
  range(from: number, to: number) {
    this.window = [from, to];
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }

  private execute() {
    let rows = this.rows.filter((row) => this.filters.every((f) => f(row)));
    for (const { column, ascending } of [...this.orders].reverse()) {
      rows = [...rows].sort(
        (a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1),
      );
    }
    const count = this.wantsCount ? rows.length : null;
    if (this.window) rows = rows.slice(this.window[0], this.window[1] + 1);
    if (this.mode !== "many") {
      return { data: rows[0] ?? null, error: null, count };
    }
    return { data: rows, error: null, count };
  }

  // biome-ignore lint/suspicious/noThenProperty: Supabase query builders implement the PromiseLike protocol.
  then<TResult1, TResult2 = never>(
    onfulfilled?: (value: {
      data: Row[] | Row | null;
      error: null;
      count: number | null;
    }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const left = String(a);
  const right = String(b);
  // ISO timestamps with offsets compare by instant, not by string.
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(left) &&
    /^\d{4}-\d{2}-\d{2}T/.test(right) &&
    !Number.isNaN(leftTime) &&
    !Number.isNaN(rightTime)
  ) {
    return leftTime - rightTime;
  }
  return left < right ? -1 : 1;
}

export function createFakeSupabase(tables: FakeTables) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const client = {
    from(table: string) {
      const query = new FakeQuery(tables[table] ?? []);
      return new Proxy(query, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value !== "function" || prop === "then") return value;
          return (...args: unknown[]) => {
            calls.push({ table, method: String(prop), args });
            const result = value.apply(target, args);
            return result === target ? receiver : result;
          };
        },
      });
    },
  };
  return {
    supabase: client as unknown as SupabaseClient<Database>,
    calls,
  };
}
