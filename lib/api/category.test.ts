import { describe, expect, it } from "vitest";
import { nextDisplayOrder, validateReorderIds } from "./category";

describe("nextDisplayOrder", () => {
  it("기존 순서가 없으면 0을 반환한다", () => {
    expect(nextDisplayOrder([])).toBe(0);
  });

  it("기존 최댓값 + 1을 반환한다", () => {
    expect(nextDisplayOrder([0, 1, 2])).toBe(3);
  });

  it("순서가 연속적이지 않아도 최댓값 + 1을 반환한다", () => {
    expect(nextDisplayOrder([0, 5, 3])).toBe(6);
  });

  it("하나의 항목만 있을 때 1을 반환한다", () => {
    expect(nextDisplayOrder([0])).toBe(1);
  });

  it("큰 순서 값도 올바르게 처리한다", () => {
    expect(nextDisplayOrder([10, 20, 15])).toBe(21);
  });

  it("음수 순서 값이 포함되어도 최댓값 + 1을 반환한다", () => {
    expect(nextDisplayOrder([-1, 0, 3])).toBe(4);
  });

  it("동일한 순서 값이 있어도 최댓값 + 1을 반환한다", () => {
    expect(nextDisplayOrder([2, 2, 2])).toBe(3);
  });
});

describe("validateReorderIds", () => {
  it("모든 ID가 가구 카테고리에 속하면 true를 반환한다", () => {
    const ids = new Set(["id-1", "id-2", "id-3"]);
    expect(validateReorderIds(["id-1", "id-2"], ids)).toBe(true);
  });

  it("하나라도 가구 카테고리에 없으면 false를 반환한다", () => {
    const ids = new Set(["id-1", "id-2"]);
    expect(validateReorderIds(["id-1", "id-999"], ids)).toBe(false);
  });

  it("빈 요청 배열이면 true를 반환한다", () => {
    const ids = new Set(["id-1"]);
    expect(validateReorderIds([], ids)).toBe(true);
  });

  it("가구 카테고리가 없을 때 빈 요청도 true를 반환한다", () => {
    expect(validateReorderIds([], new Set())).toBe(true);
  });

  it("가구 카테고리가 없을 때 요청이 있으면 false를 반환한다", () => {
    expect(validateReorderIds(["id-1"], new Set())).toBe(false);
  });

  it("모든 가구 카테고리를 포함한 전체 재정렬도 통과한다", () => {
    const ids = new Set(["id-1", "id-2", "id-3"]);
    expect(validateReorderIds(["id-3", "id-1", "id-2"], ids)).toBe(true);
  });
});
