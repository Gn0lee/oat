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

  it("income 타입도 허용된다", () => {
    const incomeResult = createLedgerEntrySchema.safeParse({
      type: "income",
      amount: 3000000,
      title: "월급",
      transactedAt: validDatetime,
    });
    expect(incomeResult.success).toBe(true);
  });

  describe("transfer validation", () => {
    const base = {
      type: "transfer" as const,
      amount: 50000,
      transactedAt: "2026-05-08T00:00:00.000Z",
      title: "카카오페이 충전",
      isShared: true,
    };

    it("이체는 출발지와 도착지가 필요하다", () => {
      const result = createLedgerEntrySchema.safeParse(base);
      expect(result.success).toBe(false);
    });

    it("이체는 카테고리를 가질 수 없다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...base,
        categoryId: "00000000-0000-0000-0000-000000000001",
        fromAccountId: "00000000-0000-0000-0000-000000000002",
        toAccountId: "00000000-0000-0000-0000-000000000003",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("non_expense_withdrawal validation", () => {
    const base = {
      type: "non_expense_withdrawal" as const,
      amount: 50000,
      transactedAt: "2026-06-12T00:00:00.000Z",
      title: "카드대금 결제",
      isShared: true,
    };

    it("비지출 출금은 출금처(계좌 또는 결제수단) 중 하나만 필요하다", () => {
      const okAccount = createLedgerEntrySchema.safeParse({
        ...base,
        fromAccountId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      expect(okAccount.success).toBe(true);

      const okPm = createLedgerEntrySchema.safeParse({
        ...base,
        fromPaymentMethodId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      });
      expect(okPm.success).toBe(true);

      const missingSource = createLedgerEntrySchema.safeParse(base);
      expect(missingSource.success).toBe(false);

      const doubleSource = createLedgerEntrySchema.safeParse({
        ...base,
        fromAccountId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        fromPaymentMethodId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      });
      expect(doubleSource.success).toBe(false);
    });

    it("비지출 출금은 입금처(to_*)를 가질 수 없다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...base,
        fromAccountId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        toAccountId: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      });
      expect(result.success).toBe(false);
    });

    it("비지출 출금은 카테고리(categoryId)를 가질 수 없다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...base,
        fromAccountId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        categoryId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tags validation", () => {
    it("유효한 태그 목록을 허용한다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validMinInput,
        tags: ["#여행", "회사정산"],
      });
      expect(result.success).toBe(true);
    });

    it("태그 개수가 5개를 초과하면 실패한다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validMinInput,
        tags: ["#일", "#이", "#삼", "#사", "#오", "#육"],
      });
      expect(result.success).toBe(false);
    });

    it("태그 이름이 (샵 제외하고) 15자를 초과하면 실패한다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validMinInput,
        tags: ["#일이삼사오육칠팔구십일이삼사오육"], // 16자
      });
      expect(result.success).toBe(false);
    });

    it("공백이 포함된 태그 이름은 실패한다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validMinInput,
        tags: ["#일 이"],
      });
      expect(result.success).toBe(false);
    });

    it("허용되지 않는 특수문자가 포함되면 실패한다", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validMinInput,
        tags: ["카페!"],
      });
      expect(result.success).toBe(false);
    });
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

  it("공개범위 변경은 수정 API에서 거부한다", () => {
    const result = updateLedgerEntrySchema.safeParse({ isShared: false });
    expect(result.success).toBe(false);
  });

  it("memo가 500자를 초과하면 실패한다", () => {
    const result = updateLedgerEntrySchema.safeParse({
      memo: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("tags를 null로 설정하여 태그를 초기화할 수 있다", () => {
    const result = updateLedgerEntrySchema.safeParse({ tags: null });
    expect(result.success).toBe(true);
  });

  it("tags에 유효한 태그 배열을 전달할 수 있다", () => {
    const result = updateLedgerEntrySchema.safeParse({ tags: ["#여행"] });
    expect(result.success).toBe(true);
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
