import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createLedgerEntrySchema,
  updateLedgerEntrySchema,
} from "./ledger-entry";

const batchSchema = z.object({
  entries: z.array(createLedgerEntrySchema).min(1).max(20),
});

const validDatetime = "2026-04-24T10:00:00.000Z";

const validMinInput = {
  type: "expense" as const,
  amount: 50000,
  title: "테스트 내역",
  transactedAt: validDatetime,
};

describe("createLedgerEntrySchema", () => {
  it("유효한 최소 입력으로 파싱된다", () => {
    const result = createLedgerEntrySchema.safeParse(validMinInput);
    expect(result.success).toBe(true);
  });

  it("transactedAt이 없으면 실패한다", () => {
    const result = createLedgerEntrySchema.safeParse({
      type: "expense",
      amount: 50000,
      title: "테스트",
    });
    expect(result.success).toBe(false);
  });

  it("amount가 0이면 실패한다", () => {
    const result = createLedgerEntrySchema.safeParse({
      ...validMinInput,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("amount가 음수이면 실패한다", () => {
    const result = createLedgerEntrySchema.safeParse({
      ...validMinInput,
      amount: -1000,
    });
    expect(result.success).toBe(false);
  });

  it("유효하지 않은 type이면 실패한다", () => {
    const result = createLedgerEntrySchema.safeParse({
      ...validMinInput,
      type: "refund",
    });
    expect(result.success).toBe(false);
  });

  it("transactedAt이 ISO datetime 형식이 아니면 실패한다", () => {
    const result = createLedgerEntrySchema.safeParse({
      ...validMinInput,
      transactedAt: "2026-04-24",
    });
    expect(result.success).toBe(false);
  });

  it("memo가 500자를 초과하면 실패한다", () => {
    const result = createLedgerEntrySchema.safeParse({
      ...validMinInput,
      memo: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("isShared 기본값은 true다", () => {
    const result = createLedgerEntrySchema.safeParse({
      type: "income",
      amount: 5000000,
      title: "월급",
      transactedAt: validDatetime,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isShared).toBe(true);
    }
  });

  it("income, transfer 타입도 허용된다", () => {
    const incomeResult = createLedgerEntrySchema.safeParse({
      type: "income",
      amount: 3000000,
      title: "월급",
      transactedAt: validDatetime,
    });
    const transferResult = createLedgerEntrySchema.safeParse({
      type: "transfer",
      amount: 100000,
      title: "이체",
      transactedAt: validDatetime,
    });
    expect(incomeResult.success).toBe(true);
    expect(transferResult.success).toBe(true);
  });
});

describe("updateLedgerEntrySchema", () => {
  it("모든 필드가 optional이라 빈 객체도 성공한다", () => {
    const result = updateLedgerEntrySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("categoryId를 null로 설정할 수 있다", () => {
    const result = updateLedgerEntrySchema.safeParse({ categoryId: null });
    expect(result.success).toBe(true);
  });

  it("fromAccountId를 null로 설정할 수 있다", () => {
    const result = updateLedgerEntrySchema.safeParse({ fromAccountId: null });
    expect(result.success).toBe(true);
  });

  it("memo를 null로 설정할 수 있다", () => {
    const result = updateLedgerEntrySchema.safeParse({ memo: null });
    expect(result.success).toBe(true);
  });

  it("amount가 0이면 실패한다", () => {
    const result = updateLedgerEntrySchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it("유효하지 않은 type이면 실패한다", () => {
    const result = updateLedgerEntrySchema.safeParse({ type: "refund" });
    expect(result.success).toBe(false);
  });

  it("memo가 500자를 초과하면 실패한다", () => {
    const result = updateLedgerEntrySchema.safeParse({
      memo: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

const validEntry = {
  type: "expense" as const,
  amount: 10000,
  title: "테스트 내역",
  transactedAt: "2026-04-24T00:00:00.000Z",
};

describe("batchSchema", () => {
  it("유효한 entries 배열이면 성공한다", () => {
    const result = batchSchema.safeParse({ entries: [validEntry] });
    expect(result.success).toBe(true);
  });

  it("entries가 빈 배열이면 실패한다", () => {
    const result = batchSchema.safeParse({ entries: [] });
    expect(result.success).toBe(false);
  });

  it("entries가 21개 이상이면 실패한다", () => {
    const result = batchSchema.safeParse({
      entries: Array(21).fill(validEntry),
    });
    expect(result.success).toBe(false);
  });

  it("entries 중 하나라도 invalid하면 실패한다", () => {
    const result = batchSchema.safeParse({
      entries: [
        validEntry,
        {
          type: "expense",
          amount: -1000,
          transactedAt: "2026-04-24T00:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("entries가 20개이면 성공한다", () => {
    const result = batchSchema.safeParse({
      entries: Array(20).fill(validEntry),
    });
    expect(result.success).toBe(true);
  });
});
