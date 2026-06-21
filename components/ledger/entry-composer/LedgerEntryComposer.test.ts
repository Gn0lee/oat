import { describe, expect, it } from "vitest";
import { createDefaultItem, ledgerComposerSchema } from "./LedgerEntryComposer";

describe("LedgerEntryComposer schema", () => {
  it("이체 item은 카테고리 없이 from/to money source로 검증한다", () => {
    const result = ledgerComposerSchema.safeParse({
      defaultType: "transfer",
      defaultIsShared: true,
      defaultDate: "2026-06-05",
      items: [
        {
          type: "transfer",
          isShared: true,
          amount: "50000",
          title: "카카오페이 충전",
          categoryId: "",
          fromValue: "acc:account-1",
          toValue: "pm:payment-1",
          transactedAt: "2026-06-05",
          memo: "",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("태그가 6개이면 검증에 실패한다", () => {
    const result = ledgerComposerSchema.safeParse({
      defaultType: "expense",
      defaultIsShared: true,
      defaultDate: "2026-06-05",
      items: [
        {
          type: "expense",
          isShared: true,
          amount: "12000",
          title: "점심",
          categoryId: "category-1",
          transactedAt: "2026-06-05",
          memo: "",
          tags: ["#t1", "#t2", "#t3", "#t4", "#t5", "#t6"],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("태그가 정확히 5개이면 검증에 성공한다", () => {
    const result = ledgerComposerSchema.safeParse({
      defaultType: "expense",
      defaultIsShared: true,
      defaultDate: "2026-06-05",
      items: [
        {
          type: "expense",
          isShared: true,
          amount: "12000",
          title: "점심",
          categoryId: "category-1",
          transactedAt: "2026-06-05",
          memo: "",
          tags: ["#t1", "#t2", "#t3", "#t4", "#t5"],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("이체 item의 from/to가 같으면 검증에 실패한다", () => {
    const result = ledgerComposerSchema.safeParse({
      defaultType: "transfer",
      defaultIsShared: true,
      defaultDate: "2026-06-05",
      items: [
        {
          type: "transfer",
          isShared: true,
          amount: "50000",
          title: "카카오페이 충전",
          fromValue: "acc:account-1",
          toValue: "acc:account-1",
          transactedAt: "2026-06-05",
          memo: "",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("지출 item은 카테고리가 필요하다", () => {
    const result = ledgerComposerSchema.safeParse({
      defaultType: "expense",
      defaultIsShared: true,
      defaultDate: "2026-06-05",
      items: [
        {
          type: "expense",
          isShared: true,
          amount: "12000",
          title: "점심",
          categoryId: "",
          transactedAt: "2026-06-05",
          memo: "",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("이체 기본 item은 from/to를 빈 값으로 초기화한다", () => {
    expect(
      createDefaultItem({
        type: "transfer",
        isShared: true,
        date: "2026-06-05",
      }),
    ).toMatchObject({
      type: "transfer",
      categoryId: "",
      fromValue: "",
      toValue: "",
      tags: [],
    });
  });
  it("createDefaultItem은 isShared 매개변수를 생성되는 객체에 정확히 매핑한다", () => {
    expect(
      createDefaultItem({
        type: "expense",
        isShared: false,
        date: "2026-06-05",
      }),
    ).toMatchObject({
      type: "expense",
      isShared: false,
      transactedAt: "2026-06-05",
    });
  });
});
