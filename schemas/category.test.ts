import { describe, expect, it } from "vitest";
import {
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "./category";

describe("createCategorySchema", () => {
  it("유효한 최소 입력으로 파싱된다", () => {
    const result = createCategorySchema.safeParse({
      type: "expense",
      name: "반려동물",
    });
    expect(result.success).toBe(true);
  });

  it("icon이 없어도 파싱된다", () => {
    const result = createCategorySchema.safeParse({
      type: "income",
      name: "부업",
    });
    expect(result.success).toBe(true);
  });

  it("icon이 null이어도 파싱된다", () => {
    const result = createCategorySchema.safeParse({
      type: "expense",
      name: "기타",
      icon: null,
    });
    expect(result.success).toBe(true);
  });

  it("유효하지 않은 type이면 실패한다", () => {
    const result = createCategorySchema.safeParse({
      type: "transfer",
      name: "이체",
    });
    expect(result.success).toBe(false);
  });

  it("name이 빈 문자열이면 실패한다", () => {
    const result = createCategorySchema.safeParse({
      type: "expense",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("name이 20자를 초과하면 실패한다", () => {
    const result = createCategorySchema.safeParse({
      type: "expense",
      name: "a".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("name이 정확히 20자이면 파싱된다", () => {
    const result = createCategorySchema.safeParse({
      type: "expense",
      name: "a".repeat(20),
    });
    expect(result.success).toBe(true);
  });

  it("icon이 50자를 초과하면 실패한다", () => {
    const result = createCategorySchema.safeParse({
      type: "expense",
      name: "식비",
      icon: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCategorySchema", () => {
  it("모든 필드가 optional이라 빈 객체도 성공한다", () => {
    const result = updateCategorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("name만 변경할 수 있다", () => {
    const result = updateCategorySchema.safeParse({ name: "새이름" });
    expect(result.success).toBe(true);
  });

  it("icon을 null로 설정할 수 있다", () => {
    const result = updateCategorySchema.safeParse({ icon: null });
    expect(result.success).toBe(true);
  });

  it("name이 빈 문자열이면 실패한다", () => {
    const result = updateCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("name이 20자를 초과하면 실패한다", () => {
    const result = updateCategorySchema.safeParse({ name: "a".repeat(21) });
    expect(result.success).toBe(false);
  });
});

describe("reorderCategoriesSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("유효한 입력으로 파싱된다", () => {
    const result = reorderCategoriesSchema.safeParse({
      orders: [{ id: validUuid, displayOrder: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("orders가 빈 배열이면 실패한다", () => {
    const result = reorderCategoriesSchema.safeParse({ orders: [] });
    expect(result.success).toBe(false);
  });

  it("id가 UUID 형식이 아니면 실패한다", () => {
    const result = reorderCategoriesSchema.safeParse({
      orders: [{ id: "not-a-uuid", displayOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("displayOrder가 음수이면 실패한다", () => {
    const result = reorderCategoriesSchema.safeParse({
      orders: [{ id: validUuid, displayOrder: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("displayOrder가 0이면 파싱된다", () => {
    const result = reorderCategoriesSchema.safeParse({
      orders: [{ id: validUuid, displayOrder: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("displayOrder가 소수이면 실패한다", () => {
    const result = reorderCategoriesSchema.safeParse({
      orders: [{ id: validUuid, displayOrder: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("여러 항목을 한 번에 처리할 수 있다", () => {
    const result = reorderCategoriesSchema.safeParse({
      orders: [
        { id: "550e8400-e29b-41d4-a716-446655440001", displayOrder: 0 },
        { id: "550e8400-e29b-41d4-a716-446655440002", displayOrder: 1 },
        { id: "550e8400-e29b-41d4-a716-446655440003", displayOrder: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
